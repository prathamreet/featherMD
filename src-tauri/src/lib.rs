use tauri::{Manager, Emitter};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

struct InitialFileState(Mutex<Option<String>>);

/// Read a file and return its content as a string
#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file '{}': {}", path, e))
}

/// Write content to a file
#[tauri::command]
async fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content).map_err(|e| format!("Failed to write file '{}': {}", path, e))
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(InitialFileState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![read_file, write_file, get_initial_file])
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
