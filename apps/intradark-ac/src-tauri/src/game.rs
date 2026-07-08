use std::process::Command;

use crate::attestation::CREATE_NO_WINDOW;

/// Detect whether CS2 is running. VAC SAFETY: uses `tasklist` (the OS process list)
/// only — it never opens a handle to cs2.exe or reads its memory.
pub fn detect_game() -> bool {
    let mut cmd = Command::new("tasklist");
    cmd.args(["/FI", "IMAGENAME eq cs2.exe", "/NH", "/FO", "CSV"]);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let output = cmd.output();
    match output {
        Ok(o) => String::from_utf8_lossy(&o.stdout)
            .to_lowercase()
            .contains("cs2.exe"),
        Err(_) => false,
    }
}
