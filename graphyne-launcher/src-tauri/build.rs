fn main() {
  // error message instead of a silent panic.
  if let Err(e) = tauri_build::try_build(tauri_build::Attributes::new()) {
    panic!(
      "tauri-build failed: {e}\n\n\
       If the error is 'Access is denied' (os error 5), Windows Defender \
       is likely locking the sidecar binary. Add your project folder to \
       Windows Security exclusions and retry."
    );
  }
}