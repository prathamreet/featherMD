use tauri::{Manager, Emitter};
use std::fs;
use std::path::PathBuf;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![read_file, write_file])
        .setup(|app| {
            // Check for CLI file argument
            let args: Vec<String> = std::env::args().collect();
            if args.len() > 1 {
                let file_path = PathBuf::from(&args[1]);
                if file_path.exists() && file_path.is_file() {
                    if let Ok(content) = fs::read_to_string(&file_path) {
                        let path_str = file_path
                            .canonicalize()
                            .unwrap_or(file_path.clone())
                            .to_string_lossy()
                            .to_string();

                        // Emit file-opened event to frontend
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
