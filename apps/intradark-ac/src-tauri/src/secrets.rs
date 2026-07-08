use keyring::{Entry, Error as KeyringError};

/// Device-token storage in the Windows Credential Manager (P1). The long-lived
/// device token (minted at /api/ac/pair) is the client's credential on every
/// request; we keep it in the OS vault, never on disk in plaintext.

const SERVICE: &str = "com.intradark.ac";
const ACCOUNT: &str = "device-token";

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE, ACCOUNT).map_err(|e| e.to_string())
}

pub fn save_token(token: &str) -> Result<(), String> {
    entry()?.set_password(token).map_err(|e| e.to_string())
}

pub fn get_token() -> Option<String> {
    entry().ok()?.get_password().ok()
}

pub fn clear_token() -> Result<(), String> {
    match entry()?.delete_password() {
        Ok(()) => Ok(()),
        Err(KeyringError::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
