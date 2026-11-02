const COMMANDS: &[&str] = &["features", "is_supported", "print_pdf"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
