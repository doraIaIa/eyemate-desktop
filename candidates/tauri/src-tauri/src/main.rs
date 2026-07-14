fn main() {
  let test_mode = std::env::args().any(|argument| argument == "--test");
  let app = tauri::Builder::default()
    .build(tauri::generate_context!())
    .expect("tauri M0 candidate failed to build");

  app.run(move |handle, event| {
    if test_mode && matches!(event, tauri::RunEvent::Ready) {
      let handle = handle.clone();
      std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(250));
        handle.exit(0);
      });
    }
  });
}
