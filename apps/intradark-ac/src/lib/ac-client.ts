/**
 * Anticheat backend client + local signature matching. Talks to the Next app's
 * /api/ac/* routes using the device token. The client is "dumb" — it fetches the
 * server-owned signature bundle, matches its own scan locally, and reports findings;
 * the server decides what's suspicious (§Q3).
 */
import type { Environment } from "./environment";
import { acFetch } from "./tauri";
import type { DriverEntry, ProcessEntry, SystemInventory } from "./tauri";

const API_BASE: string =
  (import.meta.env.VITE_AC_API_BASE as string | undefined) ?? "https://intradark.com";

/** The web page where the user pairs/authenticates this device. */
export function pairingPageUrl(): string {
  return `${API_BASE}/settings`;
}

export type PairResult = { deviceToken: string; deviceId: string; steamid64: string | null };

export type Signature = {
  kind: "hash" | "process_name" | "driver_name" | "window";
  value: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  label: string | null;
};

export type SignatureBundle = { version: string; signatures: Signature[] };

export type Finding = {
  kind: string;
  severity: Signature["severity"];
  signatureLabel: string | null;
  dedupParts: Record<string, unknown>;
  payload: Record<string, unknown>;
};

/** Extract the pairing token from an `intradark-ac://pair?token=…` deep link. */
export function parsePairToken(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "intradark-ac:") return null;
    return u.searchParams.get("token");
  } catch {
    return null;
  }
}

/** Exchange a pairing token for a long-lived device token. */
export async function pair(pairingToken: string): Promise<PairResult> {
  const res = await acFetch(`${API_BASE}/api/ac/pair`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: pairingToken, osInfo: { platform: "windows" } }),
  });
  if (!res.ok) throw new Error(`Pairing failed (${res.status})`);
  const json = await res.json();
  return { deviceToken: json.deviceToken, deviceId: json.deviceId, steamid64: json.steamid64 ?? null };
}

export type AcProfile = {
  username: string;
  avatarUrl: string | null;
  email: string | null;
  steamid64: string | null;
};

/** The paired user's identity for display in the app. */
export async function getMe(token: string): Promise<AcProfile> {
  const res = await acFetch(`${API_BASE}/api/ac/me`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Profile fetch failed (${res.status})`);
  return res.json();
}

export type HeartbeatResult = { sessionId: string; matchId: string | null; intervalS: number };

export async function heartbeat(
  token: string,
  body: {
    sessionId?: string;
    steamid64?: string | null;
    appVersion?: string;
    env?: Partial<Environment> & { raw?: Record<string, unknown> };
  },
): Promise<HeartbeatResult> {
  const res = await acFetch(`${API_BASE}/api/ac/heartbeat`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Heartbeat failed (${res.status})`);
  return res.json();
}

export async function getSignatures(token: string): Promise<SignatureBundle> {
  const res = await acFetch(`${API_BASE}/api/ac/signatures`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Signatures fetch failed (${res.status})`);
  return res.json();
}

export async function postEvents(
  token: string,
  sessionId: string | undefined,
  findings: Finding[],
): Promise<void> {
  if (findings.length === 0) return;
  const res = await acFetch(`${API_BASE}/api/ac/events`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      sessionId,
      events: findings.map((f) => ({
        kind: f.kind,
        severity: f.severity,
        dedupParts: f.dedupParts,
        payload: { ...f.payload, signatureLabel: f.signatureLabel },
      })),
    }),
  });
  if (!res.ok) throw new Error(`Events post failed (${res.status})`);
}

/**
 * Match a scan inventory against the signature bundle. Pure + deterministic — the
 * server still owns the verdict; this only flags what's on the list.
 */
export function matchInventory(
  inventory: SystemInventory,
  bundle: SignatureBundle,
): Finding[] {
  const findings: Finding[] = [];
  const byKind = (k: Signature["kind"]) =>
    bundle.signatures.filter((s) => s.kind === k);

  const hashSigs = new Map(byKind("hash").map((s) => [s.value.toLowerCase(), s]));
  const procNameSigs = byKind("process_name").map((s) => ({
    ...s,
    needle: s.value.toLowerCase(),
  }));
  const driverNameSigs = byKind("driver_name").map((s) => ({
    ...s,
    needle: s.value.toLowerCase(),
  }));

  for (const p of inventory.processes) {
    if (p.sha256) {
      const hit = hashSigs.get(p.sha256.toLowerCase());
      if (hit) findings.push(processFinding("signature_match", hit, p));
    }
    const name = p.name.toLowerCase();
    for (const s of procNameSigs) {
      if (name.includes(s.needle)) findings.push(processFinding("signature_match", s, p));
    }
  }

  for (const d of inventory.drivers) {
    const name = d.name.toLowerCase();
    for (const s of driverNameSigs) {
      if (name.includes(s.needle)) findings.push(driverFinding(s, d));
    }
  }

  return findings;
}

function processFinding(kind: string, sig: Signature, p: ProcessEntry): Finding {
  return {
    kind,
    severity: sig.severity,
    signatureLabel: sig.label,
    dedupParts: { sig: sig.value, sigKind: sig.kind, proc: p.name },
    payload: { process: p.name, path: p.path, sha256: p.sha256 },
  };
}

function driverFinding(sig: Signature, d: DriverEntry): Finding {
  return {
    kind: "signature_match",
    severity: sig.severity,
    signatureLabel: sig.label,
    dedupParts: { sig: sig.value, sigKind: sig.kind, driver: d.name },
    payload: { driver: d.name, path: d.path, state: d.state },
  };
}
