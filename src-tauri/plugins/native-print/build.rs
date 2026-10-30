const COMMANDS: &[&str] = &["print_pdf", "is_supported", "save_file", "features"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
