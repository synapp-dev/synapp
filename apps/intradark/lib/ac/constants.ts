/**
 * Anticheat liveness thresholds. See docs/anticheat-client-build-decisions.md §Q5.
 *
 * These are the single source of truth for "how fresh is live" and "how long a gap
 * before the in-match kick fires". Generous on purpose: the in-match kick must NOT
 * punish a CS2 crash-and-restart or a brief network drop (the "don't break legit
 * players" constraint).
 */

/** Client heartbeat cadence. */
export const AC_HEARTBEAT_INTERVAL_S = 10;

/**
 * Accept gate: a player counts as "AC live" only if their last heartbeat is within
 * this window. Strict is cheap here — failing only means you can't accept and the
 * queue back-fills.
 */
export const AC_ACCEPT_FRESHNESS_S = 30;

/** In-match: warn the player in the client UI after this much silence. */
export const AC_INMATCH_WARN_CLIENT_S = 30;

/** In-match: warn the player via MatchZy in-game chat after this much silence. */
export const AC_INMATCH_WARN_INGAME_S = 60;

/** In-match: RCON-kick the player after this much continuous silence. */
export const AC_INMATCH_KICK_S = 90;

/** Pairing token TTL (deep-link → /api/ac/pair exchange window). */
export const AC_PAIRING_TOKEN_TTL_S = 300;
