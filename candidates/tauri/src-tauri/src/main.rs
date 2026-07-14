mod m0_storage;

fn m0_hold_ms() -> u64 {
  std::env::args()
    .find_map(|argument| argument.strip_prefix("--m0-hold-ms=").and_then(|value| value.parse::<u64>().ok()))
    .unwrap_or(250)
}

fn main() {
  let test_mode = std::env::args().any(|argument| argument == "--test");
  let hold_ms = m0_hold_ms();
  let app = tauri::Builder::default()
    .build(tauri::generate_context!())
    .expect("tauri M0 candidate failed to build");

  app.run(move |handle, event| {
    if test_mode && matches!(event, tauri::RunEvent::Ready) {
      let handle = handle.clone();
      std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(hold_ms));
        handle.exit(0);
      });
    }
  });
}
