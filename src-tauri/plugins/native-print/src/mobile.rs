use std::path::Path;

use tauri::{AppHandle, Runtime};

/// Prints the PDF through the mobile print screen.
///
/// The platform side is implemented in `android/src/main/java/NativePrintPlugin.kt`
/// and `ios/Sources/NativePrintPlugin.swift`.
pub fn print_pdf<R: Runtime>(
    app: &AppHandle<R>,
    path: &Path,
    name: &str,
) -> Result<bool, String> {
    let path = path.to_string_lossy().to_string();
    let name = name.to_string();

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        mobile_bridge(app, "printPdf", path, name)
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let _ = (app, path, name);
        Ok(false)
    }
}

/// Saves the file through the platform's own document picker.
pub fn export_file<R: Runtime>(app: &AppHandle<R>, path: &Path) -> Result<bool, String> {
    let path = path.to_string_lossy().to_string();

    #[cfg(target_os = "ios")]
    {
        mobile_bridge(app, "exportFile", path, String::new())
    }

    #[cfg(not(target_os = "ios"))]
    {
        let _ = (app, path);
        Ok(false)
    }
}

/// Calls a method on the mobile side of the plugin.
#[cfg(any(target_os = "android", target_os = "ios"))]
fn mobile_bridge<R: Runtime>(
    app: &AppHandle<R>,
    method: &str,
    path: String,
    name: String,
) -> Result<bool, String> {
    use serde::Serialize;

    #[derive(Serialize)]
    struct Payload {
        path: String,
        name: String,
    }

    let payload = serde_json::json!({
        "payload": Payload { path, name }
    });

    app.handle()
        .plugin("native-print")
        .expect("native-print plugin not registered")
        .run_mobile_plugin(method, payload)
        .map_err(|error| error.to_string())
}