use tauri::Runtime;

#[cfg(target_os = "macos")]
mod macos;

mod commands;

pub use commands::{features, is_supported, print_pdf};

pub fn init<R: Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::<R>::new("native-print")
        .invoke_handler(tauri::generate_handler![
            commands::features,
            commands::is_supported,
            commands::print_pdf
        ])
        .setup(|_app, _api| {
            Ok(())
        })
        .build()
}
