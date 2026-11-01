use std::fs;
use std::path::PathBuf;

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use serde::Serialize;
use tauri::{AppHandle, Manager, Runtime};

#[cfg(target_os = "macos")]
use super::macos;

#[cfg(any(target_os = "android", target_os = "ios"))]
use super::mobile;

/// Capabilities of the current platform.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeFeatures {
    pub print: bool,
    pub save_file: bool,
}

fn cache_dir<R: Runtime>(app: &AppHandle<R>) -> Option<PathBuf> {
    app.path().app_cache_dir().ok()
}

/// Writes the payload into a temp file below `folder` inside the app cache.
fn write_temp_file<R: Runtime>(
    app: &AppHandle<R>,
    folder: &str,
    name: &str,
    data: &str,
) -> Option<PathBuf> {
    let base = cache_dir(app)?;
    let dir = base.join(folder);

    // Each folder is cleared at the start of the next call.
    if dir.exists() {
        let _ = fs::remove_dir_all(&dir);
    }
    fs::create_dir_all(&dir).ok()?;

    let path = dir.join(name);
    let bytes = BASE64.decode(data).ok()?;
    fs::write(&path, bytes).ok()?;

    Some(path)
}

/// Reports the capabilities of the current platform.
#[tauri::command]
pub fn features<R: Runtime>(app: AppHandle<R>) -> NativeFeatures {
    let _ = &app;

    let print = cfg!(any(
        target_os = "macos",
        target_os = "ios",
        target_os = "android"
    ));
    let save_file = cfg!(target_os = "ios");

    NativeFeatures { print, save_file }
}

/// Kept for compatibility with older app versions.
#[tauri::command]
pub fn is_supported<R: Runtime>(app: AppHandle<R>) -> bool {
    features(app).print
}

/// Prints the PDF through the platform print screen.
#[tauri::command]
pub fn print_pdf<R: Runtime>(
    app: AppHandle<R>,
    name: String,
    data: String,
) -> Result<bool, String> {
    let path = write_temp_file(&app, "print", &name, &data)
        .ok_or_else(|| "Could not prepare the document for printing".to_string())?;

    #[cfg(target_os = "macos")]
    {
        return macos::print_pdf(&path).map_err(|error| error.to_string());
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        return mobile::print_pdf(&app, &path, &name).map_err(|error| error.to_string());
    }

    #[cfg(not(any(
        target_os = "macos",
        target_os = "android",
        target_os = "ios"
    )))]
    {
        let _ = path;
        Ok(false)
    }
}

/// Saves the payload through the platform's own file picker.
#[tauri::command]
pub fn save_file<R: Runtime>(
    app: AppHandle<R>,
    name: String,
    data: String,
) -> Result<bool, String> {
    let path = write_temp_file(&app, "export", &name, &data)
        .ok_or_else(|| "Could not prepare the file".to_string())?;

    #[cfg(target_os = "ios")]
    {
        return mobile::export_file(&app, &path).map_err(|error| error.to_string());
    }

    #[cfg(not(target_os = "ios"))]
    {
        let _ = path;
        Ok(false)
    }
}
