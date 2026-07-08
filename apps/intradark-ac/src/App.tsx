import { ShieldIcon, CheckIcon } from "./components/icons";
import { pairingPageUrl } from "./lib/ac-client";
import { openExternal } from "./lib/tauri";
import { useAnticheat, type AcConn } from "./lib/use-anticheat";

// The FACEIT-style status window, driven by the live orchestrator: pairing,
// environment attestation, heartbeat, and CS2 detection.

export default function App() {
  const { env, conn, steamid64, profile, gameRunning } = useAnticheat();

  const attested = env ? env.tpmPresent && env.secureBoot && env.iommu : false;
  const paired = conn !== "unpaired";

  return (
    <div className="app">
      <main className="body">
        <section className="account">
          {profile?.avatarUrl ? (
            <img className="avatar" src={profile.avatarUrl} alt="" />
          ) : (
            <div className="avatar" aria-hidden />
          )}
          <div className="account-meta">
            <div className="account-name">
              {profile
                ? profile.username
                : paired
                  ? "This device is paired"
                  : "Not paired"}
            </div>
            <div className="account-sub">
              {profile?.email
                ? profile.email
                : steamid64
                  ? `SteamID ${steamid64}`
                  : "Authenticate to pair this device with your account"}
            </div>
          </div>
          <button
            className="auth-btn"
            onClick={() => void openExternal(pairingPageUrl())}
          >
            {paired ? "RE-PAIR" : "AUTHENTICATE"}
          </button>
        </section>

        <section className={`attest ${attested ? "ok" : "warn"}`}>
          <div className="attest-icon">
            {attested ? <CheckIcon /> : <ShieldIcon />}
          </div>
          <div className="attest-text">
            <div className="attest-title">
              {env
                ? attested
                  ? "TPM, Secure Boot & IOMMU are enabled on your system"
                  : "Some hardware security features are unavailable"
                : "Checking system…"}
            </div>
            <div className="attest-sub">
              {env ? (
                <>
                  TPM {flag(env.tpmPresent)} · Secure Boot {flag(env.secureBoot)} ·
                  IOMMU {flag(env.iommu)} · VBS {flag(env.vbs)}
                </>
              ) : (
                "Reading TPM / Secure Boot / IOMMU / VBS state"
              )}
            </div>
          </div>
        </section>

        <footer className="status">
          <span className={`dot ${conn}`} />
          <span className="status-label">{label(conn)}</span>
          <span className="status-sep">|</span>
          <span className="status-detail">
            {gameRunning ? "CS2 detected — protected" : "Waiting for game to launch…"}
          </span>
        </footer>
      </main>
    </div>
  );
}

function flag(v: boolean): string {
  return v ? "on" : "off";
}

function label(conn: AcConn): string {
  switch (conn) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting…";
    case "error":
      return "Reconnecting…";
    case "unpaired":
      return "Not paired";
  }
}
