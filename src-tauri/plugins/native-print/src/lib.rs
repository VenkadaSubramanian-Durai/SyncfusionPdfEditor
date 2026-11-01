use tauri::{Runtime};

mod commands;

pub use commands::{features, is_supported, print_pdf, save_file};

/// Entry point used by the Tauri builder.
pub fn init<R: Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::<R>::new("native-print")
        .invoke_handler(tauri::generate_handler![
            commands::features,
            commands::is_supported,
            commands::print_pdf,
            commands::save_file
        ])
        .setup(|app, _api| {
            let _ = app;
            Ok(())
        })
        .build()
}
