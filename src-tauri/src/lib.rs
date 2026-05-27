use tauri::{Manager, Emitter};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::SystemTime;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

struct InitialFileState(Mutex<Option<String>>);

struct FileWatcher {
    active_path: Mutex<Option<String>>,
    stop_signal: Mutex<Arc<AtomicBool>>,
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

#[tauri::command]
async fn watch_file(
    window: tauri::Window,
    path: String,
    state: tauri::State<'_, FileWatcher>,
) -> Result<(), String> {
    // 1. Stop any existing watch thread
    {
        let signal = state.stop_signal.lock().map_err(|e| e.to_string())?;
        signal.store(true, Ordering::Relaxed);
    }
    
    // 2. Create new signal
    let new_signal = Arc::new(AtomicBool::new(false));
    let new_signal_clone = new_signal.clone();
    
    // 3. Store new active path
    {
        let mut active_path = state.active_path.lock().map_err(|e| e.to_string())?;
        *active_path = Some(path.clone());
    }
    
    // 4. Get initial modified time
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    let modified_time = metadata.modified().map_err(|e| e.to_string())?;
    
    // 5. Set new stop signal in state
    {
        let mut signal = state.stop_signal.lock().map_err(|e| e.to_string())?;
        *signal = new_signal;
    }
    
    let path_clone = path.clone();
    tauri::async_runtime::spawn(async move {
        let mut last_time = modified_time;
        let mut failure_count = 0;
        while !new_signal_clone.load(Ordering::Relaxed) {
            tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;
            
            if new_signal_clone.load(Ordering::Relaxed) {
                break;
            }
            
            match fs::metadata(&path_clone) {
                Ok(metadata) => {
                    failure_count = 0;
                    if let Ok(current_time) = metadata.modified() {
                        if current_time > last_time {
                            last_time = current_time;
                            let _ = window.emit("file-changed-on-disk", serde_json::json!({
                                "path": path_clone
                            }));
                        }
                    }
                }
                Err(_) => {
                    failure_count += 1;
                    if failure_count >= 5 {
                        break;
                    }
                }
            }
        }
    });
    
    Ok(())
}

#[tauri::command]
async fn unwatch_file(state: tauri::State<'_, FileWatcher>) -> Result<(), String> {
    let signal = state.stop_signal.lock().map_err(|e| e.to_string())?;
    signal.store(true, Ordering::Relaxed);
    let mut active_path = state.active_path.lock().map_err(|e| e.to_string())?;
    *active_path = None;
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
        .manage(FileWatcher {
            active_path: Mutex::new(None),
            stop_signal: Mutex::new(Arc::new(AtomicBool::new(false))),
        })
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

                    // Store path in managed state for the frontend to request once loaded
                    let state = app.state::<InitialFileState>();
                    if let Ok(mut initial_file) = state.0.lock() {
                        *initial_file = Some(path_str.clone());
                    }

                    // Emit file-opened event to frontend (for other instances / runtime handles)
                    if let Ok(content) = fs::read_to_string(&file_path) {
                        let window = app.get_webview_window("main").unwrap();
                        let _ = window.emit("file-opened", serde_json::json!({
                            "path": path_str,
                            "content": content
                        }));
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
