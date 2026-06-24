/**
 * Redaction for secret values in a server's `environment` map before it reaches
 * the client. Used by both the create echo and the detail proxy so the GSLT
 * (`STEAM_ACC`) never appears in the test console — including in Redline's own
 * plaintext echo on GET detail. Pure + client-safe.
 */

/** Env keys whose values are secrets and must never be shown to the client. */
export const SECRET_ENV_KEYS = new Set(["STEAM_ACC"]);

const REDACTED = "***redacted***";

export function redactEnvironment(env: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    out[k] = SECRET_ENV_KEYS.has(k) && v ? REDACTED : v;
  }
  return out;
}
