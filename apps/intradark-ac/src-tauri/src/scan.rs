use std::collections::HashMap;
use std::fs;
use std::sync::Mutex;
use std::time::UNIX_EPOCH;

use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::attestation::run_powershell;

/// System-scoped scan inventory (P5). VAC SAFETY: enumerates the OS process list +
/// loaded drivers via Get-Process / Get-CimInstance and hashes on-disk images. It
/// NEVER opens, reads, or enumerates modules of the cs2.exe process.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProcessEntry {
    pub name: String,
    pub path: Option<String>,
    pub sha256: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DriverEntry {
    pub name: String,
    pub path: Option<String>,
    pub state: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SystemInventory {
    pub processes: Vec<ProcessEntry>,
    pub drivers: Vec<DriverEntry>,
}

/// Hash cache keyed on path → (size, mtime_secs, sha256). Avoids re-hashing an
/// unchanged binary across scans (the perf rule from §Q3b).
static HASH_CACHE: Mutex<Option<HashMap<String, (u64, u64, String)>>> = Mutex::new(None);

const PROCESSES_PS: &str =
    "Get-Process | Select-Object -Property Name, Path, Id | ConvertTo-Json -Compress";
const DRIVERS_PS: &str =
    "Get-CimInstance Win32_SystemDriver | Select-Object -Property Name, PathName, State | ConvertTo-Json -Compress";

pub fn scan_system() -> SystemInventory {
    SystemInventory {
        processes: scan_processes(),
        drivers: scan_drivers(),
    }
}

fn to_array(raw: &str) -> Vec<Value> {
    match serde_json::from_str::<Value>(raw) {
        Ok(Value::Array(a)) => a,
        Ok(Value::Null) => vec![],
        // ConvertTo-Json collapses a single item to an object — wrap it.
        Ok(other) => vec![other],
        Err(_) => vec![],
    }
}

fn str_field(obj: &Value, key: &str) -> Option<String> {
    obj.get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
}

fn scan_processes() -> Vec<ProcessEntry> {
    let raw = match run_powershell(PROCESSES_PS) {
        Some(s) => s,
        None => return vec![],
    };
    to_array(&raw)
        .iter()
        .filter_map(|obj| {
            let name = str_field(obj, "Name")?;
            let path = str_field(obj, "Path");
            let sha256 = path.as_deref().and_then(hash_file_cached);
            Some(ProcessEntry { name, path, sha256 })
        })
        .collect()
}

fn scan_drivers() -> Vec<DriverEntry> {
    let raw = match run_powershell(DRIVERS_PS) {
        Some(s) => s,
        None => return vec![],
    };
    to_array(&raw)
        .iter()
        .filter_map(|obj| {
            let name = str_field(obj, "Name")?;
            Some(DriverEntry {
                name,
                path: str_field(obj, "PathName"),
                state: str_field(obj, "State"),
            })
        })
        .collect()
}

/// SHA-256 of a file, memoized on (size, mtime). None if unreadable.
fn hash_file_cached(path: &str) -> Option<String> {
    let meta = fs::metadata(path).ok()?;
    let size = meta.len();
    let mtime = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    {
        let mut guard = HASH_CACHE.lock().ok()?;
        let cache = guard.get_or_insert_with(HashMap::new);
        if let Some((csize, cmtime, hash)) = cache.get(path) {
            if *csize == size && *cmtime == mtime {
                return Some(hash.clone());
            }
        }
    }

    let bytes = fs::read(path).ok()?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let hash = hex::encode(hasher.finalize());

    if let Ok(mut guard) = HASH_CACHE.lock() {
        let cache = guard.get_or_insert_with(HashMap::new);
        cache.insert(path.to_string(), (size, mtime, hash.clone()));
    }
    Some(hash)
}
