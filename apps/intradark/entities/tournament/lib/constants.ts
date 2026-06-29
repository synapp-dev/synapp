/**
 * Tournament module constants — format slugs, lifecycle states, and the default
 * format_config per driver. See docs/tournaments/plan.md.
 */

export const FORMAT_LADDER = "ladder" as const;
export const FORMAT_LEAGUE = "league" as const;
export const FORMAT_BRACKET = "bracket" as const;
export const FORMAT_QUEUE = "queue" as const;

export const FORMAT_SLUGS = [
  FORMAT_LADDER,
  FORMAT_LEAGUE,
  FORMAT_BRACKET,
  FORMAT_QUEUE,
] as const;
export type FormatSlug = (typeof FORMAT_SLUGS)[number];

export const ENTRY_TYPES = ["open", "approval", "invite_only"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const RECURRENCES = ["one_shot", "recurring"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export const GAME_MODES = ["1v1", "2v2", "3v3", "5v5"] as const;
export type GameMode = (typeof GAME_MODES)[number];

export const SEASON_STATUSES = [
  "draft",
  "announced",
  "registration_open",
  "registration_closed",
  "seeding",
  "live",
  "completed",
  "archived",
] as const;
export type SeasonStatus = (typeof SEASON_STATUSES)[number];

export const MATCH_SOURCES = [
  "queue",
  "fixture",
  "bracket",
  "ladder_challenge",
  "scrim",
] as const;
export type MatchSource = (typeof MATCH_SOURCES)[number];

/** Default team size implied by a game mode (used for min/max roster seeding). */
export const GAME_MODE_TEAM_SIZE: Record<GameMode, number> = {
  "1v1": 1,
  "2v2": 2,
  "3v3": 3,
  "5v5": 5,
};
