const COMMANDS: &[&str] = &["features", "is_supported", "print_pdf", "save_file"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
