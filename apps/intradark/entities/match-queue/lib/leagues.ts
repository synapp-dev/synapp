/**
 * Queue league tiers + core PUG constants. Client-safe (no server imports) so the
 * Play UI and the backend share one source of truth. Mirrors the LEAGUE_OPTIONS in
 * components/organisms/faceit-play-mock.tsx (highest → lowest skill band).
 */

export const QUEUE_LEAGUES = ["champions", "stellaris", "genesis", "open"] as const;
export type QueueLeague = (typeof QUEUE_LEAGUES)[number];

export const DEFAULT_LEAGUE: QueueLeague = "open";

/** 5v5 — ten players form a match, five per team. */
export const MATCH_SIZE = 10;
export const TEAM_SIZE = 5;

/** §4 accept-phase window (seconds). */
export const ACCEPT_WINDOW_SECONDS = 30;

/** Default internal ELO for a player with no rating row yet. */
export const DEFAULT_RATING = 1000;

export function isQueueLeague(value: string): value is QueueLeague {
  return (QUEUE_LEAGUES as readonly string[]).includes(value);
}
