//! iOS and Android: hand the PDF file to the Swift / Kotlin plugin class.

use serde::{de::DeserializeOwned, Deserialize};
use tauri::{
    plugin::{PluginApi, PluginHandle},
    Runtime,
};

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_native_print);

pub struct NativePrint<R: Runtime>(pub PluginHandle<R>);

pub fn init<R: Runtime, C: DeserializeOwned>(
    api: PluginApi<R, C>,
) -> Result<NativePrint<R>, Box<dyn std::error::Error>> {
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin("com.plugin.native_print", "NativePrintPlugin")?;
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_native_print)?;
    Ok(NativePrint(handle))
}

#[derive(Deserialize)]
struct PrintResult {
    printed: bool,
}

#[cfg(target_os = "ios")]
#[derive(serde::Serialize)]
struct ExportArgs {
    path: String,
}

#[cfg(target_os = "ios")]
#[derive(Deserialize)]
struct ExportResult {
    saved: bool,
}

/// iOS: shows the "Save to Files" sheet for the file; blocks until it closes.
#[cfg(target_os = "ios")]
pub fn export<R: Runtime>(handle: &PluginHandle<R>, path: String) -> Result<bool, String> {
    handle
        .run_mobile_plugin::<ExportResult>("exportFile", ExportArgs { path })
        .map(|r| r.saved)
        .map_err(|e| e.to_string())
}

/// Blocks until the native side resolves (iOS: print sheet closed;
/// Android: system print screen opened).
pub fn print<R: Runtime>(handle: &PluginHandle<R>, args: super::PrintArgs) -> Result<bool, String> {
    handle
        .run_mobile_plugin::<PrintResult>("printPdf", args)
        .map(|r| r.printed)
        .map_err(|e| e.to_string())
}
