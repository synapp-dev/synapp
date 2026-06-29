import { createHash, randomBytes } from "node:crypto";

/**
 * Device-token helpers. The device token is the long-lived credential the AC client
 * stores in the OS credential vault and presents on every request as
 * `Authorization: Bearer <device-token>`. We store only its SHA-256 hash in
 * `ac_devices.token_hash` — the raw token is shown to the client exactly once at pairing.
 *
 * Pure + deterministic (except generate), so unit-testable without a DB.
 */

/** Mint a fresh opaque device token (256 bits, url-safe base64). */
export function generateDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex of a device token — what we persist and look up by. */
export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Extract the bearer token from an Authorization header. Returns null for a missing
 * or malformed header (caller turns that into a 401).
 */
export function parseBearer(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}
