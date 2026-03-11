use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

/// Resolve where Graphyne should store its data at runtime.
/// Returns a path like:
///   Windows : C:\Users\<user>\AppData\Roaming\com.graphyne.app
///   macOS   : ~/Library/Application Support/com.graphyne.app
///   Linux   : ~/.local/share/com.graphyne.app
fn resolve_app_data_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("Could not resolve app data directory")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_data = resolve_app_data_dir(app.handle());

            // Create sub-directories the server expects
            let graphics_dir = app_data.join("graphics");
            let uploads_dir  = app_data.join("uploads");
            std::fs::create_dir_all(&graphics_dir)
                .expect("Failed to create graphics directory");
            std::fs::create_dir_all(&uploads_dir)
                .expect("Failed to create uploads directory");

            // SQLite path
            let db_path = app_data.join("graphyne.db");
            let database_url = format!("file:{}", db_path.to_string_lossy());

            // DATA_DIR tells the server where graphics/uploads live
            let data_dir_str = app_data.to_string_lossy().to_string();

            println!("📂 App data  : {}", data_dir_str);
            println!("💾 Database  : {}", database_url);

            // Spawn the sidecar server
            let sidecar = app
                .handle()
                .shell()
                .sidecar("graphyne-server")
                .expect("graphyne-server sidecar binary not found — did you run the bundle step?")
                .env("DATABASE_URL", &database_url)
                .env("DATA_DIR", &data_dir_str)
                .env("NODE_ENV", "production");

            let (mut rx, _child) = sidecar
                .spawn()
                .expect("Failed to spawn graphyne-server sidecar");

            // Pipe server stdout/stderr to the Tauri console
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(bytes) => {
                            print!("[server] {}", String::from_utf8_lossy(&bytes));
                        }
                        CommandEvent::Stderr(bytes) => {
                            eprint!("[server] {}", String::from_utf8_lossy(&bytes));
                        }
                        CommandEvent::Terminated(status) => {
                            eprintln!("[server] Process exited: {:?}", status);
                            break;
                        }
                        _ => {}
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Error while running Graphyne");
}