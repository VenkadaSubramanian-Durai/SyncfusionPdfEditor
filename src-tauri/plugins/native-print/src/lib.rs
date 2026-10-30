//! native-print: prints a PDF with the operating system's own print screen,
//! and (iOS only) saves files with the system "Save to Files" sheet.
//!
//! Why: the PDF Viewer prints by calling `window.print()`. Windows (WebView2) and
//! Linux (WebKitGTK) handle that, but the WebViews on macOS, iOS and Android do not
//! show a print screen. On those platforms the app sends the edited PDF here instead:
//!
//! * macOS   – PDFKit + the standard AppKit print panel (Rust, `macos.rs`)
//! * iOS     – UIPrintInteractionController (Swift, `ios/Sources`)
//! * Android – PrintManager + PrintDocumentAdapter (Kotlin, `android/src`)
//!
//! The real PDF is printed (not page images), so text stays sharp.
//!
//! Saving on iOS: the dialog plugin's Save As on iOS only returns a location; the app
//! cannot write to it afterwards. `save_file` instead hands a finished file to
//! UIDocumentPickerViewController (export), so the user picks a folder and iOS copies it.

use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{
    ipc::{InvokeBody, Request},
    plugin::{Builder, TauriPlugin},
    AppHandle, Manager, Runtime,
};

#[cfg(target_os = "macos")]
mod macos;
#[cfg(mobile)]
mod mobile;

/// Arguments handed to the Swift / Kotlin side.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct PrintArgs {
    path: String,
    name: String,
}

/// True on the platforms where this plugin shows the print screen.
/// Elsewhere (Windows, Linux) the app keeps using the viewer's own `window.print()`.
const SUPPORTED: bool = cfg!(any(target_os = "macos", target_os = "ios", target_os = "android"));

/// True where `save_file` is needed (iOS). Elsewhere the dialog + fs plugins save files.
const SAVE_FILE: bool = cfg!(target_os = "ios");

#[tauri::command]
fn is_supported() -> bool {
    SUPPORTED
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Features {
    print: bool,
    save_file: bool,
}

#[tauri::command]
fn features() -> Features {
    Features { print: SUPPORTED, save_file: SAVE_FILE }
}

/// Body: the file bytes (raw). Header `x-file-name`: URI-encoded file name.
/// iOS: shows the "Save to Files" sheet. Returns true when saved, false when cancelled.
#[tauri::command]
async fn save_file<R: Runtime>(app: AppHandle<R>, request: Request<'_>) -> Result<bool, String> {
    let bytes = match request.body() {
        InvokeBody::Raw(bytes) => bytes.clone(),
        _ => return Err("Expected the file as raw bytes.".into()),
    };
    let name = request
        .headers()
        .get("x-file-name")
        .and_then(|v| v.to_str().ok())
        .map(percent_decode)
        .map(|n| clean_name(&n))
        .unwrap_or_else(|| "file".into());
    let path = write_temp(&app, "export", &name, &bytes)?;
    export_file(app, path).await
}

#[cfg(target_os = "ios")]
async fn export_file<R: Runtime>(app: AppHandle<R>, path: PathBuf) -> Result<bool, String> {
    let handle = app.state::<mobile::NativePrint<R>>().0.clone();
    let path = path.to_string_lossy().into_owned();
    tauri::async_runtime::spawn_blocking(move || mobile::export(&handle, path))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg(not(target_os = "ios"))]
async fn export_file<R: Runtime>(_app: AppHandle<R>, _path: PathBuf) -> Result<bool, String> {
    Err("Use the dialog plugin's Save As on this platform.".into())
}

/// Body: the PDF bytes (raw). Header `x-file-name`: URI-encoded file name (job title).
/// Returns true when the job was sent to the printer (or the print screen was shown,
/// on Android, where the system print screen does not report back).
#[tauri::command]
async fn print_pdf<R: Runtime>(app: AppHandle<R>, request: Request<'_>) -> Result<bool, String> {
    let bytes = match request.body() {
        InvokeBody::Raw(bytes) => bytes.clone(),
        _ => return Err("Expected the PDF as raw bytes.".into()),
    };
    if bytes.len() < 5 || &bytes[..5] != b"%PDF-" {
        return Err("The data is not a PDF document.".into());
    }
    let name = request
        .headers()
        .get("x-file-name")
        .and_then(|v| v.to_str().ok())
        .map(percent_decode)
        .map(|n| safe_file_name(&n))
        .unwrap_or_else(|| "document.pdf".into());

    let path = write_temp(&app, "print", &name, &bytes)?;
    print_file(app, path, name).await
}

/// Writes the file into the app's private cache folder (`print` or `export`).
/// Earlier files there are removed first (they cannot be removed right after use:
/// Android reads the print file later, while the user is still in the print screen).
fn write_temp<R: Runtime>(app: &AppHandle<R>, folder: &str, name: &str, bytes: &[u8]) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("No cache folder: {e}"))?
        .join(folder);
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).map_err(|e| format!("Could not create {}: {e}", dir.display()))?;
    let path = dir.join(name);
    std::fs::write(&path, bytes).map_err(|e| format!("Could not write {}: {e}", path.display()))?;
    Ok(path)
}

#[cfg(target_os = "macos")]
async fn print_file<R: Runtime>(app: AppHandle<R>, path: PathBuf, name: String) -> Result<bool, String> {
    macos::print(&app, path, name).await
}

#[cfg(mobile)]
async fn print_file<R: Runtime>(app: AppHandle<R>, path: PathBuf, name: String) -> Result<bool, String> {
    let handle = app.state::<mobile::NativePrint<R>>().0.clone();
    let args = PrintArgs { path: path.to_string_lossy().into_owned(), name };
    tauri::async_runtime::spawn_blocking(move || mobile::print(&handle, args))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg(not(any(target_os = "macos", mobile)))]
async fn print_file<R: Runtime>(_app: AppHandle<R>, _path: PathBuf, _name: String) -> Result<bool, String> {
    Err("Native printing is not used on this platform; the viewer prints with window.print().".into())
}

/// Keeps only the file name part and makes sure it ends in .pdf.
fn safe_file_name(name: &str) -> String {
    let cleaned = clean_name(name);
    if cleaned.to_lowercase().ends_with(".pdf") {
        cleaned
    } else {
        format!("{cleaned}.pdf")
    }
}

/// Keeps only the file name part, without characters that are not allowed in names.
fn clean_name(name: &str) -> String {
    let base = Path::new(name)
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();
    let cleaned: String = base
        .chars()
        .map(|c| if c.is_control() || "\\/:*?\"<>|".contains(c) { '_' } else { c })
        .collect();
    let cleaned = cleaned.trim().trim_start_matches('.').to_string();
    if cleaned.is_empty() { "document".to_string() } else { cleaned }
}

/// Decodes `encodeURIComponent` output (header values must be ASCII).
fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Some(b) = s.get(i + 1..i + 3).and_then(|h| u8::from_str_radix(h, 16).ok()) {
                out.push(b);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// Initializes the plugin. Register it with `.plugin(tauri_plugin_native_print::init())`.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("native-print")
        .invoke_handler(tauri::generate_handler![print_pdf, is_supported, save_file, features])
        .setup(|_app, _api| {
            #[cfg(mobile)]
            _app.manage(mobile::init(_api)?);
            Ok(())
        })
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names() {
        assert_eq!(safe_file_name("../../etc/passwd"), "passwd.pdf");
        assert_eq!(safe_file_name("Report Q3.PDF"), "Report Q3.PDF");
        assert_eq!(safe_file_name(""), "document.pdf");
        assert_eq!(safe_file_name("a:b"), "a_b.pdf");
        assert_eq!(percent_decode("R%C3%A9sum%C3%A9%20v2.pdf"), "Résumé v2.pdf");
        assert_eq!(percent_decode("100%"), "100%");
        assert_eq!(percent_decode("a%2"), "a%2");
        assert_eq!(clean_name("notes/sample.json"), "sample.json");
        assert_eq!(clean_name("sample.xfdf"), "sample.xfdf");
    }
}
