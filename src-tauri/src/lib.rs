//! Native shell for the Syncfusion PDF Editor sample (Tauri 2).
//!
//! The whole UI is the React app in ../src. Rust only does what the web app
//! cannot: hand over PDFs that the operating system asks us to open
//! (double-click, "Open with", file association).

use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
// Emitter and RunEvent are only used on macOS and iOS.
#[allow(unused_imports)]
use tauri::{Emitter, RunEvent};

/// A PDF handed over by the operating system.
#[derive(Clone, Serialize)]
struct OpenedFile {
    name: String,
    base64: String,
}

/// PDF passed on the command line at start-up (Windows / Linux file association).
struct StartupFile(Mutex<Option<PathBuf>>);

fn is_pdf(path: &Path) -> bool {
    path.extension()
        .map(|ext| ext.eq_ignore_ascii_case("pdf"))
        .unwrap_or(false)
}

fn read_pdf(path: &Path) -> Result<OpenedFile, String> {
    if !is_pdf(path) {
        return Err("Only PDF files can be opened.".into());
    }
    let bytes = std::fs::read(path).map_err(|e| format!("Could not read {}: {e}", path.display()))?;
    Ok(OpenedFile {
        name: path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "document.pdf".into()),
        base64: STANDARD.encode(bytes),
    })
}

/// Called once by the web app on start-up. Returns the PDF the app was launched
/// with, if any, so it opens instead of the bundled sample.
#[tauri::command]
fn take_startup_file(state: tauri::State<'_, StartupFile>) -> Result<Option<OpenedFile>, String> {
    let path = state.0.lock().map_err(|e| e.to_string())?.take();
    path.map(|p| read_pdf(&p)).transpose()
}

pub fn run() {
    let startup = std::env::args_os()
        .skip(1)
        .map(PathBuf::from)
        .find(|p| is_pdf(p));

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(StartupFile(Mutex::new(startup)))
        .invoke_handler(tauri::generate_handler![take_startup_file])
        .build(tauri::generate_context!())
        .expect("error while building the Tauri application");

    app.run(|_handle, _event| {
        // macOS and iOS deliver "Open with" files as an event instead of arguments.
        #[cfg(any(target_os = "macos", target_os = "ios"))]
        if let RunEvent::Opened { urls } = &_event {
            for url in urls {
                if let Ok(path) = url.to_file_path() {
                    if let Ok(file) = read_pdf(&path) {
                        let _ = _handle.emit("open-file", file);
                    }
                }
            }
        }
    });
}
