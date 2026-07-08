use std::process::Command;

use serde::{Deserialize, Serialize};

/// Windows CREATE_NO_WINDOW — suppresses the console window when spawning CLI tools.
#[cfg(windows)]
pub(crate) const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Environment attestation snapshot. Informational only — NEVER gates play in v1
/// (see docs/anticheat-client-build-decisions.md §Q7).
#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Environment {
    pub tpm_present: bool,
    pub secure_boot: bool,
    pub iommu: bool,
    pub vbs: bool,
    pub os_build: String,
}

/// One PowerShell pass that reads every attestation value as compact JSON. All
/// system-scoped queries — VAC-safe, never touches the game. Critically, every read
/// works WITHOUT admin elevation (the app runs non-elevated): Secure Boot from the
/// registry (not Confirm-SecureBootUEFI, which needs admin) and TPM from the PnP
/// security-devices list (not Get-Tpm, which needs admin).
const ATTEST_PS: &str = r#"
# Secure Boot — registry state (non-admin). 1 = enabled.
$sb = $false
try {
  $v = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\SecureBoot\State' -Name UEFISecureBootEnabled -ErrorAction Stop).UEFISecureBootEnabled
  $sb = ($v -eq 1)
} catch { $sb = $false }

# TPM present — PnP security devices (non-admin). Falls back to the TPM CIM class.
$tpm = $false
try {
  $dev = Get-PnpDevice -Class SecurityDevices -ErrorAction Stop | Where-Object { $_.FriendlyName -match 'Trusted Platform Module' }
  $tpm = [bool]$dev
} catch { $tpm = $false }
if (-not $tpm) {
  try { if (Get-CimInstance -Namespace 'root/cimv2/security/microsofttpm' -ClassName Win32_Tpm -ErrorAction Stop) { $tpm = $true } } catch {}
}

$dg = try { Get-CimInstance -Namespace root\Microsoft\Windows\DeviceGuard -ClassName Win32_DeviceGuard -ErrorAction Stop } catch { $null }
$vbs = if ($dg) { [int]$dg.VirtualizationBasedSecurityStatus -ge 1 } else { $false }
$iommu = if ($dg) { @($dg.AvailableSecurityProperties) -contains 3 } else { $false }
$build = try { "$((Get-CimInstance Win32_OperatingSystem).BuildNumber)" } catch { "" }
[pscustomobject]@{ tpmPresent=$tpm; secureBoot=$sb; iommu=$iommu; vbs=$vbs; osBuild=$build } | ConvertTo-Json -Compress
"#;

/// Read the host environment. Best-effort: any failure yields a conservative
/// all-false snapshot rather than erroring (attestation is informational).
pub fn read_environment() -> Environment {
    match run_powershell(ATTEST_PS) {
        Some(json) => serde_json::from_str::<Environment>(&json).unwrap_or_default(),
        None => Environment::default(),
    }
}

pub(crate) fn run_powershell(script: &str) -> Option<String> {
    let mut cmd = Command::new("powershell");
    cmd.args([
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        script,
    ]);
    // Don't flash a console window on each call (the scan runs these repeatedly).
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let output = cmd.output().ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.is_empty() {
        None
    } else {
        Some(stdout)
    }
}
