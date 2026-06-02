use tauri::{Manager, Emitter};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};

struct InitialFileState(Mutex<Option<String>>);

/// Holds the active filesystem watcher. Dropping the watcher releases the
/// underlying OS handle (ReadDirectoryChangesW / inotify), so the thread
/// sleeps at 0% CPU until the next event arrives.
struct FileWatcher {
    watcher: Mutex<Option<RecommendedWatcher>>,
}

/// Get the initial file path and content if loaded via CLI argument
#[tauri::command]
async fn get_initial_file(state: tauri::State<'_, InitialFileState>) -> Result<Option<serde_json::Value>, String> {
    let mut file_opt = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(path) = file_opt.take() {
        if let Ok(content) = fs::read_to_string(&path) {
            return Ok(Some(serde_json::json!({
                "path": path,
                "content": content
            })));
        }
    }
    Ok(None)
}

/// Begin watching `path` for external modifications using event-driven OS
/// notifications. Replaces any previously installed watcher.
#[tauri::command]
async fn watch_file(
    window: tauri::Window,
    path: String,
    state: tauri::State<'_, FileWatcher>,
) -> Result<(), String> {
    // Drop any existing watcher first so its OS handle is released before we
    // install the next one.
    {
        let mut slot = state.watcher.lock().map_err(|e| e.to_string())?;
        *slot = None;
    }

    let watched_path = PathBuf::from(&path);
    let emit_path = path.clone();

    // Coalesce bursts of events (editors often emit several syscalls per save).
    let mut last_emit: Option<Instant> = None;
    let debounce = Duration::from_millis(50);

    let mut watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
        let Ok(event) = res else { return };
        let interesting = matches!(
            event.kind,
            EventKind::Modify(_) | EventKind::Create(_) | EventKind::Remove(_)
        );
        if !interesting {
            return;
        }
        let now = Instant::now();
        if let Some(prev) = last_emit {
            if now.duration_since(prev) < debounce {
                return;
            }
        }
        last_emit = Some(now);
        let _ = window.emit(
            "file-changed-on-disk",
            serde_json::json!({ "path": emit_path }),
        );
    })
    .map_err(|e| e.to_string())?;

    watcher
        .configure(Config::default().with_poll_interval(Duration::from_secs(60)))
        .map_err(|e| e.to_string())?;

    watcher
        .watch(Path::new(&watched_path), RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    let mut slot = state.watcher.lock().map_err(|e| e.to_string())?;
    *slot = Some(watcher);
    Ok(())
}

#[tauri::command]
async fn unwatch_file(state: tauri::State<'_, FileWatcher>) -> Result<(), String> {
    let mut slot = state.watcher.lock().map_err(|e| e.to_string())?;
    *slot = None;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(InitialFileState(Mutex::new(None)))
        .manage(FileWatcher { watcher: Mutex::new(None) })
        .invoke_handler(tauri::generate_handler![get_initial_file, watch_file, unwatch_file])
        .setup(|app| {
            // Check for CLI file argument
            let args: Vec<String> = std::env::args().collect();
            if args.len() > 1 {
                let file_path = PathBuf::from(&args[1]);
                if file_path.exists() && file_path.is_file() {
                    let path_str = file_path
                        .canonicalize()
                        .unwrap_or(file_path.clone())
                        .to_string_lossy()
                        .to_string();

                    // Store path in managed state for the frontend to request via get_initial_file
                    let state = app.state::<InitialFileState>();
                    if let Ok(mut initial_file) = state.0.lock() {
                        *initial_file = Some(path_str);
                    };
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
