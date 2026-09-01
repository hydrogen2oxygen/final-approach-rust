use std::net::{SocketAddr, TcpListener, TcpStream};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

struct BackendProcess(Mutex<Option<CommandChild>>);

#[tauri::command]
fn open_data_folder(app: tauri::AppHandle) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("data");
    std::fs::create_dir_all(&data_dir).map_err(|error| error.to_string())?;

    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer")
        .arg(&data_dir)
        .spawn()
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn save_api_file(app: tauri::AppHandle, api_uuid: String, content: String) -> Result<String, String> {
    if api_uuid.is_empty()
        || !api_uuid
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '-' || character == '_')
    {
        return Err("The API UUID contains invalid filename characters.".to_string());
    }

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("data");
    std::fs::create_dir_all(&data_dir).map_err(|error| error.to_string())?;

    let file_path = data_dir.join(format!("{api_uuid}.php"));
    std::fs::write(&file_path, content).map_err(|error| error.to_string())?;

    Ok(file_path.to_string_lossy().into_owned())
}

fn reserve_free_port() -> std::io::Result<u16> {
    let listener = TcpListener::bind(("127.0.0.1", 0))?;
    Ok(listener.local_addr()?.port())
}

fn wait_for_backend(address: SocketAddr, timeout: Duration) -> bool {
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        if TcpStream::connect_timeout(&address, Duration::from_millis(250)).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_data_folder, save_api_file])
        .plugin(tauri_plugin_single_instance::init(|app, _arguments, _working_directory| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(BackendProcess(Mutex::new(None)))
        .setup(|app| {
            let port = reserve_free_port()?;
            let data_dir = app.path().app_data_dir()?.join("data");
            std::fs::create_dir_all(&data_dir)?;

            let sidecar = app
                .shell()
                .sidecar("finalApproach-server")?
                .args([port.to_string(), data_dir.to_string_lossy().into_owned()]);
            let (mut events, child) = sidecar.spawn()?;
            tauri::async_runtime::spawn(async move {
                while events.recv().await.is_some() {}
            });
            *app.state::<BackendProcess>().0.lock().unwrap() = Some(child);

            let address = SocketAddr::from(([127, 0, 0, 1], port));
            if !wait_for_backend(address, Duration::from_secs(10)) {
                return Err(format!("Final Approach backend did not start on {address}").into());
            }

            let url = format!("http://127.0.0.1:{port}").parse()?;
            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url))
                .title("Final Approach")
                .inner_size(1280.0, 800.0)
                .min_inner_size(800.0, 600.0)
                .resizable(true)
                .build()?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Final Approach")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }) {
                if let Some(child) = app.state::<BackendProcess>().0.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
        });
}
