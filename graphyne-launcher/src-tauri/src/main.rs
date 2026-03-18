//  Graphyne Launcher
//  ─────────────────────────────────────────────────────────────────────────────

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    collections::HashMap,
    net::TcpStream,
    sync::Mutex,
    thread,
    time::Duration,
};

use tauri::{async_runtime, AppHandle, Manager, RunEvent, WebviewWindowBuilder};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

// ── State ─────────────────────────────────────────────────────────────────────

struct ServerProcess(Mutex<Option<CommandChild>>);

// ── TCP readiness probe ───────────────────────────────────────────────────────

fn wait_for_server(port: u16, timeout_ms: u64) -> bool {
    let addr = format!("127.0.0.1:{}", port);
    let deadline = std::time::Instant::now() + Duration::from_millis(timeout_ms);

    while std::time::Instant::now() < deadline {
        if TcpStream::connect_timeout(
            &addr.parse().unwrap(),
            Duration::from_millis(200),
        )
        .is_ok()
        {
            return true;
        }
        thread::sleep(Duration::from_millis(300));
    }
    false
}

// ── Entry point ───────────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(ServerProcess(Mutex::new(None)))
        .setup(|app| {
            let app_handle: AppHandle = app.handle().clone();

            // ── 1. Resolve paths ─────────────────────────────────────────
            let resource_dir = app.path()
                .resource_dir()
                .expect("Could not resolve resource_dir");

            let client_dir = resource_dir.join("client");

            let data_dir = app.path()
                .app_data_dir()
                .expect("Could not resolve app_data_dir");

            std::fs::create_dir_all(&data_dir)
                .expect("Could not create app data directory");

            let db_url = format!(
                "file:{}/graphyne.db",
                data_dir.to_string_lossy().replace('\\', "/")
            );

            println!("📂 CLIENT_DIR  = {}", client_dir.display());
            println!("💾 DATA_DIR    = {}", data_dir.display());
            println!("🗄️  DATABASE_URL = {}", db_url);

            // ── 2. Spawn the sidecar ─────────────────────────────────────
            let mut env_vars: HashMap<String, String> = HashMap::new();
            env_vars.insert(
                "GRAPHYNE_CLIENT_DIR".into(),
                client_dir.to_string_lossy().into_owned(),
            );
            env_vars.insert(
                "GRAPHYNE_DATA_DIR".into(),
                data_dir.to_string_lossy().into_owned(),
            );
            env_vars.insert("DATABASE_URL".into(), db_url);

            let (mut rx, child) = app.shell()
                .sidecar("graphyne-server")
                .expect("graphyne-server sidecar not found — run 'npm run build:binary' first")
                .envs(env_vars)
                .spawn()
                .expect("Failed to spawn graphyne-server sidecar");

            *app_handle
                .state::<ServerProcess>()
                .0
                .lock()
                .unwrap() = Some(child);

            // ── 3. Forward stdout/stderr ─────────────────────────────────
            async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(bytes) => {
                            print!("[server] {}", String::from_utf8_lossy(&bytes));
                        }
                        CommandEvent::Stderr(bytes) => {
                            eprint!("[server] {}", String::from_utf8_lossy(&bytes));
                        }
                        CommandEvent::Error(e) => eprintln!("[server] error: {e}"),
                        CommandEvent::Terminated(status) => {
                            println!("[server] terminated: {:?}", status);
                            break;
                        }
                        _ => {}
                    }
                }
            });

            // ── 4. Wait for readiness, then navigate ─────────────────────
            // In Tauri 2.x windows are WebviewWindows. get_webview_window()
            // replaces get_window().
            let window = app.get_webview_window("main")
                .expect("main window missing");

            thread::spawn(move || {
                if wait_for_server(3001, 30_000) {
                    thread::sleep(Duration::from_millis(150));
                    window
                        .eval("window.location.replace('http://localhost:3001/editor')")
                        .unwrap_or_else(|e| eprintln!("Navigation failed: {e}"));
                } else {
                    eprintln!("❌ Server did not start within 30 seconds.");
                    window
                        .eval("document.getElementById('status').textContent = 'Server failed to start. Please restart Graphyne.'")
                        .ok();
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Error building Tauri application")
        .run(|app_handle, event| {
            // ── 5. Kill sidecar on window close ──────────────────────────
            if let RunEvent::WindowEvent {
                label,
                event: tauri::WindowEvent::CloseRequested { .. },
                ..
            } = event
            {
                if label == "main" {
                    if let Some(child) = app_handle
                        .state::<ServerProcess>()
                        .0
                        .lock()
                        .unwrap()
                        .take()
                    {
                        println!("🛑 Stopping Graphyne server...");
                        child.kill().ok();
                    }
                }
            }
        });
}