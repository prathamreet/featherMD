use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager};

// Tray + menu are Windows-only (see `setup_tray`), so their imports are gated to
// avoid unused-import errors on Linux/macOS builds.
#[cfg(target_os = "windows")]
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};

struct InitialFileState(Mutex<Option<String>>);

/// Whether a system-tray icon is currently active (Windows-only, and only when
/// the user's `sysTray` preference is on). The frontend reads this via the
/// `tray_active` command to decide what closing the window should do: hide it to
/// the tray, or quit outright (Linux/macOS, or tray disabled). This prevents a
/// "close hides an invisible, unrecoverable window" trap. See CF2-1.
struct TrayActive(AtomicBool);

/// Holds the active filesystem watcher. Dropping the watcher releases the
/// underlying OS handle (ReadDirectoryChangesW / inotify), so the thread
/// sleeps at 0% CPU until the next event arrives.
struct FileWatcher {
    watcher: Mutex<Option<RecommendedWatcher>>,
}

/// Get the initial file path and content if loaded via CLI argument
#[tauri::command]
async fn get_initial_file(
    state: tauri::State<'_, InitialFileState>,
) -> Result<Option<serde_json::Value>, String> {
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

/// Report whether the system tray is active (see `TrayActive`).
#[tauri::command]
fn tray_active(state: tauri::State<'_, TrayActive>) -> bool {
    state.0.load(Ordering::Relaxed)
}

/// Show or hide the tray icon live when the user toggles the System Tray
/// preference. Avoids relaunching the app (which breaks the dev server and
/// loses the open file). No-op where there is no tray (non-Windows).
#[tauri::command]
fn set_tray(
    app: tauri::AppHandle,
    enabled: bool,
    state: tauri::State<'_, TrayActive>,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        if let Some(tray) = app.tray_by_id("main-tray") {
            tray.set_visible(enabled).map_err(|e| e.to_string())?;
            state.0.store(enabled, Ordering::Relaxed);
        }
    }
    // Touch the args on non-Windows so they aren't flagged unused.
    #[cfg(not(target_os = "windows"))]
    let _ = (&app, enabled, &state);
    Ok(())
}

/// Begin watching `path` for external modifications using event-driven OS
/// notifications. Replaces any previously installed watcher.
#[tauri::command]
async fn watch_file(
    window: tauri::Window,
    path: String,
    state: tauri::State<'_, FileWatcher>,
) -> Result<(), String> {
    // SR2-1: validate the frontend-supplied path before installing a watcher.
    // Only an existing regular file may be watched — this closes the "watch an
    // arbitrary path" vector and avoids leaking a watcher on a typo'd path.
    let watched_path = PathBuf::from(&path);
    if !watched_path.is_file() {
        return Err(format!("Refusing to watch a non-file path: {path}"));
    }

    // Drop any existing watcher first so its OS handle is released before we
    // install the next one.
    {
        let mut slot = state.watcher.lock().map_err(|e| e.to_string())?;
        *slot = None;
    }

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

/// Bring the main window back from the system tray: show it, restore it if it
/// was minimized, and give it focus. (Windows-only — see `setup_tray`.)
#[cfg(target_os = "windows")]
fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

/// Read the persisted `sysTray` preference from config.json so the tray's
/// initial visibility matches the user's choice. Defaults to enabled when the
/// file is missing/unreadable. Windows-only (the tray itself is Windows-only).
#[cfg(target_os = "windows")]
fn tray_enabled_in_config(app: &tauri::App) -> bool {
    let Ok(dir) = app.path().app_config_dir() else {
        return true;
    };
    let Ok(content) = std::fs::read_to_string(dir.join("feathermd").join("config.json")) else {
        return true;
    };
    serde_json::from_str::<serde_json::Value>(&content)
        .ok()
        .and_then(|json| json.get("sysTray").and_then(|v| v.as_bool()))
        .unwrap_or(true)
}

/// Build the system tray (Windows-only) with the given initial visibility. The
/// icon is always created so it can be shown/hidden live via `set_tray` without
/// relaunching; `visible` reflects the persisted preference at startup.
#[cfg(target_os = "windows")]
fn setup_tray(app: &tauri::App, visible: bool) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "Show Feather MD", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    let mut tray_builder = TrayIconBuilder::with_id("main-tray")
        .tooltip("Feather MD")
        .menu(&tray_menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main_window(app),
            "quit" => {
                // Surface the window and let the frontend run its unsaved-changes
                // guard (via the `tray-quit` event) before the process exits.
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                    let _ = window.emit("tray-quit", ());
                }
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        tray_builder = tray_builder.icon(icon.clone());
    }
    let tray = tray_builder.build(app)?;
    tray.set_visible(visible)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // CF2-1: single-instance is RELEASE-ONLY. In `tauri dev`, app restarts and
    // running a second instance must not wedge on a stale lock (it would focus a
    // dead window instead of starting a fresh dev session).
    #[cfg(not(debug_assertions))]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
            // Forward a file passed to the second launch so it opens in the
            // running instance rather than being lost.
            if let Some(arg) = argv.get(1) {
                if PathBuf::from(arg).is_file() {
                    let _ = window.emit("open-file-from-args", arg.clone());
                }
            }
        }
    }));

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(InitialFileState(Mutex::new(None)))
        .manage(TrayActive(AtomicBool::new(false)))
        .manage(FileWatcher {
            watcher: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            get_initial_file,
            watch_file,
            unwatch_file,
            tray_active,
            set_tray
        ])
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

            // ISSUE-1 / CF2-1: the system tray is Windows-only — that's where the
            // 0-byte-PDF print spooler problem lives. The icon is always built but
            // its visibility tracks the persisted `sysTray` preference, so it can
            // be toggled live (set_tray) without relaunching. A build failure is
            // logged (not fatal) and leaves TrayActive=false so the frontend falls
            // back to quit-on-close.
            #[cfg(target_os = "windows")]
            {
                let visible = tray_enabled_in_config(app);
                match setup_tray(app, visible) {
                    Ok(()) => app.state::<TrayActive>().0.store(visible, Ordering::Relaxed),
                    Err(err) => eprintln!("Failed to create system tray: {err}"),
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
