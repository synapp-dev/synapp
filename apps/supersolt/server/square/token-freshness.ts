/**
 * Pure decision logic for Square access-token refresh. Square OAuth access
 * tokens live ~30 days; we rotate ahead of expiry so API calls never see a
 * dead token mid-flight.
 */

/** Refresh once inside this window before expiry (3 days). */
export const SQUARE_TOKEN_REFRESH_BUFFER_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Parses the stored token_expires_at, tolerating both ISO strings and the
 * Postgres `timestamptz` text form ("2026-06-23 08:39:26+00"). Null when
 * absent or unparseable.
 */
export function parseSquareTokenExpiry(value: string | null | undefined): number | null {
  if (!value) return null;
  const direct = Date.parse(value);
  if (!Number.isNaN(direct)) return direct;
  const isoish = Date.parse(value.replace(" ", "T"));
  return Number.isNaN(isoish) ? null : isoish;
}

/**
 * True when the token should be refreshed now: expiry is known and inside the
 * buffer window (or already past), or the stored expiry is unreadable — a
 * spurious refresh is harmless, a dead token breaks every Square feature.
 * A null/absent expiry means the token doesn't expire (e.g. sandbox direct
 * tokens) — never refresh those.
 */
export function shouldRefreshSquareToken(
  tokenExpiresAt: string | null | undefined,
  nowMs: number,
  bufferMs: number = SQUARE_TOKEN_REFRESH_BUFFER_MS,
): boolean {
  if (tokenExpiresAt == null) return false;
  const expiresMs = parseSquareTokenExpiry(tokenExpiresAt);
  if (expiresMs == null) return true;
  return expiresMs - nowMs <= bufferMs;
}
