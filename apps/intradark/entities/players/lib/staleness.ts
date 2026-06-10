/**
 * Per-source staleness TTLs for the player archive. A snapshot is "stale" when
 * now - fetched_at exceeds the source TTL, which triggers a re-fetch.
 */

export const SOURCE_TTL_MS = {
  steam: 24 * 60 * 60 * 1000, // 24h
  faceit: 6 * 60 * 60 * 1000, // 6h
  leetify: 6 * 60 * 60 * 1000, // 6h
  gc: 24 * 60 * 60 * 1000, // 24h
} as const;

export type PlayerSource = keyof typeof SOURCE_TTL_MS;

/** Manual refresh throttle window (per ip + steamid64). */
export const MANUAL_REFRESH_COOLDOWN_MS = 5 * 60 * 1000; // 5 min

/**
 * Returns true when a snapshot taken at `fetchedAt` is older than `ttlMs`.
 * A null/undefined timestamp is always stale (never fetched).
 */
export function isStale(
  fetchedAt: string | number | Date | null | undefined,
  ttlMs: number,
  now: number = Date.now(),
): boolean {
  if (fetchedAt == null) return true;
  const ts =
    fetchedAt instanceof Date
      ? fetchedAt.getTime()
      : typeof fetchedAt === "number"
        ? fetchedAt
        : new Date(fetchedAt).getTime();
  if (Number.isNaN(ts)) return true;
  return now - ts > ttlMs;
}
