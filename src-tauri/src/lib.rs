use std::path::{Path, PathBuf};
use std::sync::Mutex;

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use serde::Serialize;
use tauri::Manager;

#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
use tauri::Emitter;

/// A file that the operating system handed over to the application.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenedFile {
    pub name: String,
    pub base64: String,
}

struct StartupFile(Mutex<Option<OpenedFile>>);

/// Reads the file the application was launched with and clears the slot.
#[tauri::command]
fn take_startup_file(state: tauri::State<'_, StartupFile>) -> Option<OpenedFile> {
    let mut slot = state.0.lock().ok()?;
    let file = slot.take();
    file
}

fn file_name_of(path: &Path) -> String {
    path.file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| "document.pdf".to_string())
}

fn read_as_base64(path: &Path) -> Option<String> {
    let bytes = std::fs::read(path).ok()?;
    Some(BASE64.encode(bytes))
}

fn opened_file_from(path: &Path) -> Option<OpenedFile> {
    Some(OpenedFile {
        name: file_name_of(path),
        base64: read_as_base64(path)?,
    })
}

/// The first argument that points at an existing PDF file.
fn startup_file_path() -> Option<PathBuf> {
    std::env::args()
        .skip(1)
        .map(PathBuf::from)
        .find(|arg| arg.is_file() && !arg.to_string_lossy().starts_with('-'))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(StartupFile(Mutex::new(None)))
        .setup(|app| {
            // A file passed on the command line is opened at start-up.
            let startup_file = startup_file_path().and_then(|path| opened_file_from(&path));

            if let Some(file) = startup_file {
                let state = app.state::<StartupFile>();
                let mut slot = state.0.lock().unwrap_or_else(|error| error.into_inner());
                *slot = Some(file);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![take_startup_file]);

    // Only macOS needs the native print panel.
    #[cfg(target_os = "macos")]
    let builder = builder.plugin(native_print::init());

    builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            // macOS and iOS deliver "Open with" requests while running.
            #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
            {
                if let tauri::RunEvent::Opened { urls } = event {
                    for url in urls {
                        let Ok(path) = url.to_file_path() else {
                            continue;
                        };

                        if let Some(file) = opened_file_from(&path) {
                            let _ = app.emit("open-file", file);
                        }
                    }
                }
            }

            #[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "android")))]
            {
                let _ = (app, event);
            }
        });
}
