export type LegitimacyTier = "suspicious" | "unverified" | "established" | "trusted";
export type ConfidenceBand = "low" | "med" | "high";

export interface LegitimacyGameEntry {
  finishedAt?: string | number | null;
  leetifyRating?: number | null;
  hasBannedPlayer?: boolean;
  partySize?: number | null;
}

/** Normalized inputs for the pure scorer — assembled server-side from DB rows. */
export interface LegitimacyInput {
  steamid64: string;
  accountCreatedAt?: string | null;
  /** 1 = private, 3 = public */
  communityVisibility?: number | null;
  steamLevel?: number | null;
  friendsCount?: number | null;
  realname?: string | null;
  hasCustomAvatar?: boolean;
  vacBanned?: boolean | null;
  gameBanned?: boolean | null;
  communityBanned?: boolean | null;
  economyBan?: string | null;
  banAgeDays?: number | null;
  cs2PlaytimeMinutes?: number | null;
  badgeCount?: number | null;
  gcVacBanned?: boolean | null;
  leetifyRating?: number | null;
  aim?: number | null;
  positioning?: number | null;
  utility?: number | null;
  opening?: number | null;
  clutch?: number | null;
  gamesPlayed?: number | null;
  premierRating?: number | null;
  games?: LegitimacyGameEntry[];
  hasLeetify?: boolean;
  faceitElo?: number | null;
  faceitLevel?: number | null;
  hasFaceit?: boolean;
  discordLinked?: boolean;
  emailVerified?: boolean;
  hasGc?: boolean;
  gcPlayerLevel?: number | null;
  /**
   * Count of admin-CONFIRMED anticheat detections (ac_flags status='confirmed').
   * Only confirmed flags feed the score — raw findings never auto-penalize
   * (see docs/anticheat-client-build-decisions.md §Q7).
   */
  acConfirmedDetections?: number | null;
}

export interface LegitimacyPenalty {
  code: string;
  points: number;
  label: string;
}

export interface LegitimacyAxisBreakdown {
  score: number;
  weight: number;
  drivers?: string[];
  note?: string;
}

export interface LegitimacyBreakdown {
  axes: {
    plausibility: LegitimacyAxisBreakdown;
    establishment: LegitimacyAxisBreakdown;
    corroboration: LegitimacyAxisBreakdown;
    karma: LegitimacyAxisBreakdown;
  };
  penalties: LegitimacyPenalty[];
  flags: { positive: string[]; risk: string[] };
  coherence: {
    skillEstimate: number;
    earnedEstimate: number;
    suspicion: number;
  };
  inputsPresent: string[];
}

export interface LegitimacyResult {
  /** Display score after confidence shrink toward prior 50. */
  score: number;
  /** Pre-shrink composite score. */
  rawScore: number;
  tier: LegitimacyTier;
  confidence: ConfidenceBand;
  coverage: number;
  breakdown: LegitimacyBreakdown;
}

export const AXIS_WEIGHTS = {
  /** Coherence + small legit-skill bonus (formerly separate skill axis). */
  plausibility: 0.5,
  establishment: 0.22,
  corroboration: 0.15,
  karma: 0.13,
} as const;

export const NEUTRAL_PRIOR = 50;
