import { useEffect, useRef, useState } from "react";

import {
  getMe,
  getSignatures,
  heartbeat,
  matchInventory,
  pair,
  parsePairToken,
  postEvents,
  type AcProfile,
  type SignatureBundle,
} from "./ac-client";
import type { Environment } from "./environment";
import {
  detectGame,
  getDeviceToken,
  getEnvironment,
  getLaunchUrl,
  onDeepLink,
  saveDeviceToken,
  scanSystem,
} from "./tauri";

const HEARTBEAT_MS = 10_000;
const SCAN_MS = 5 * 60_000;
const GAME_POLL_MS = 15_000;
const STEAMID_KEY = "ac.steamid64";

export type AcConn = "unpaired" | "connecting" | "connected" | "error";

export type AcState = {
  env: Environment | null;
  conn: AcConn;
  steamid64: string | null;
  profile: AcProfile | null;
  gameRunning: boolean;
  pairing: boolean;
  /** Trigger pairing manually (also auto-fires on deep link). */
  pairWith: (pairingToken: string) => Promise<void>;
};

export function useAnticheat(): AcState {
  const [env, setEnv] = useState<Environment | null>(null);
  const [conn, setConn] = useState<AcConn>("unpaired");
  const [steamid64, setSteamid] = useState<string | null>(null);
  const [gameRunning, setGameRunning] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [profile, setProfile] = useState<AcProfile | null>(null);
  const profileRef = useRef(false);

  const tokenRef = useRef<string | null>(null);
  const sessionRef = useRef<string | undefined>(undefined);
  const bundleRef = useRef<SignatureBundle | null>(null);
  const envRef = useRef<Environment | null>(null);
  const steamRef = useRef<string | null>(null);
  // Deep links can arrive twice (single-instance forward + on_open_url). Guard so one
  // pairing token only redeems once.
  const pairInFlight = useRef(false);
  const lastPairToken = useRef<string | null>(null);

  async function pairWith(pairingToken: string) {
    if (pairInFlight.current || lastPairToken.current === pairingToken) return;
    pairInFlight.current = true;
    lastPairToken.current = pairingToken;
    setPairing(true);
    try {
      const result = await pair(pairingToken);
      await saveDeviceToken(result.deviceToken);
      tokenRef.current = result.deviceToken;
      if (result.steamid64) {
        localStorage.setItem(STEAMID_KEY, result.steamid64);
        setSteamid(result.steamid64);
      }
      setConn("connecting");
    } catch {
      setConn("error");
      lastPairToken.current = null; // allow a retry on failure
    } finally {
      pairInFlight.current = false;
      setPairing(false);
    }
  }

  // One heartbeat round.
  async function beat() {
    const token = tokenRef.current;
    if (!token) return;
    try {
      const e = envRef.current;
      const res = await heartbeat(token, {
        sessionId: sessionRef.current,
        steamid64: steamRef.current,
        appVersion: "0.0.1",
        env: e
          ? {
              tpmPresent: e.tpmPresent,
              secureBoot: e.secureBoot,
              iommu: e.iommu,
              vbs: e.vbs,
              osBuild: e.osBuild,
            }
          : undefined,
      });
      sessionRef.current = res.sessionId;
      setConn("connected");
      // Fetch the paired identity once per run.
      if (!profileRef.current) {
        profileRef.current = true;
        getMe(token)
          .then(setProfile)
          .catch(() => {
            profileRef.current = false; // allow a retry next beat
          });
      }
    } catch {
      setConn("error");
    }
  }

  // One scan round: scan → (cache) signatures → match → report.
  async function scan() {
    const token = tokenRef.current;
    if (!token) return;
    try {
      if (!bundleRef.current) bundleRef.current = await getSignatures(token);
      const inventory = await scanSystem();
      const findings = matchInventory(inventory, bundleRef.current);
      await postEvents(token, sessionRef.current, findings);
    } catch {
      // best-effort; next round retries
    }
  }

  useEffect(() => {
    steamRef.current = steamid64;
  }, [steamid64]);

  // Boot: load env, restore token + steamid, listen for deep links.
  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    (async () => {
      const e = await getEnvironment().catch(() => null);
      if (!disposed) {
        setEnv(e);
        envRef.current = e;
      }

      const stored = localStorage.getItem(STEAMID_KEY);
      if (stored && !disposed) setSteamid(stored);

      const token = await getDeviceToken();
      if (token && !disposed) {
        tokenRef.current = token;
        setConn("connecting");
      }

      unlisten = await onDeepLink((url) => {
        const t = parsePairToken(url);
        if (t) void pairWith(t);
      });

      // Cold-start: the app may have been launched *by* the deep link before this
      // listener existed — process the launch URL too (deduped in pairWith).
      const launch = await getLaunchUrl();
      if (launch && !disposed) {
        const t = parsePairToken(launch);
        if (t) void pairWith(t);
      }
    })();

    return () => {
      disposed = true;
      unlisten?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Heartbeat + scan + game-poll intervals (run once a token exists).
  useEffect(() => {
    const hb = setInterval(beat, HEARTBEAT_MS);
    const sc = setInterval(scan, SCAN_MS);
    const gp = setInterval(async () => setGameRunning(await detectGame()), GAME_POLL_MS);
    // Kick off immediately too.
    void beat();
    void scan();
    void detectGame().then(setGameRunning);
    return () => {
      clearInterval(hb);
      clearInterval(sc);
      clearInterval(gp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { env, conn, steamid64, profile, gameRunning, pairing, pairWith };
}
