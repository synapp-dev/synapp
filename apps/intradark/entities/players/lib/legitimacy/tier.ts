import type { LegitimacyTier } from "@/entities/players/lib/legitimacy/types";

export function mapTier(score: number): LegitimacyTier {
  if (score <= 34) return "suspicious";
  if (score <= 54) return "unverified";
  if (score <= 74) return "established";
  return "trusted";
}

export const TIER_LABELS: Record<LegitimacyTier, string> = {
  suspicious: "Suspicious",
  unverified: "Unverified",
  established: "Established",
  trusted: "Trusted",
};
