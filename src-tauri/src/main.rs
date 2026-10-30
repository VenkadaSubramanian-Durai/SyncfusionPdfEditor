// Hides the extra console window on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    syncfusion_pdf_editor_lib::run()
}
