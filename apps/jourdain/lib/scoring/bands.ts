// Shared score bands so every score visual uses the same thresholds.

export type ScoreBand = "high" | "mid" | "low";

export function scoreBand(score: number): ScoreBand {
  if (score >= 75) return "high";
  if (score >= 40) return "mid";
  return "low";
}
