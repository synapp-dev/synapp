import {
  PLAYER_PROFILE_COMMENTS_PER_PROFILE_24H,
  PLAYER_PROFILE_TRUST_VOTE_CHANGES_24H,
} from "./constants";
import type { ProfileTrustSignal } from "./constants";

const MS_24H = 24 * 60 * 60 * 1000;

export function isWithin24Hours(isoTimestamp: string, now = Date.now()): boolean {
  const t = Date.parse(isoTimestamp);
  if (Number.isNaN(t)) return false;
  return now - t < MS_24H;
}

export function checkCommentRateLimit(recentCount: number): boolean {
  return recentCount < PLAYER_PROFILE_COMMENTS_PER_PROFILE_24H;
}

export function checkTrustVoteRateLimit(input: {
  existingSignal: ProfileTrustSignal | null;
  existingUpdatedAt: string | null;
  newSignal: ProfileTrustSignal | null;
  now?: number;
}): boolean {
  if (input.newSignal == null) return true;
  if (input.existingSignal == null) return true;
  if (input.existingSignal === input.newSignal) return true;
  if (!input.existingUpdatedAt) return true;

  const changesAllowed = PLAYER_PROFILE_TRUST_VOTE_CHANGES_24H;
  if (changesAllowed <= 0) return false;

  return !isWithin24Hours(input.existingUpdatedAt, input.now);
}
