/**
 * Sentinel written into `matches.discord_team1_channel_id` while a single staging
 * caller is mid-creation of the Discord channels (atomic NULL → sentinel claim, see
 * staging.ts). It is never a real channel id; `getMatchView` normalises it back to
 * null so clients only ever see real channel ids or "not created yet". Client-safe.
 */
export const CHANNEL_CLAIM_SENTINEL = "pending";
