import type { ScrimMap, Tier } from "../types";

export function tierById(tiers: Tier[], id: string | null | undefined): Tier | null {
  if (!id) return null;
  return tiers.find((t) => t.id === id) ?? null;
}

export function tierRank(tiers: Tier[], id: string | null | undefined): number | null {
  return tierById(tiers, id)?.rank ?? null;
}

export function mapById(maps: ScrimMap[], id: string | null | undefined): ScrimMap | null {
  if (!id) return null;
  return maps.find((m) => m.id === id) ?? null;
}

/**
 * Can a team challenge a listing? The listing's `minTier` is the lowest skill
 * accepted ("this tier and above"), so the challenger must be at least that
 * strong: challenger.rank <= minTier.rank. No tier on either side => allowed.
 */
export function isTierWorthy(
  tiers: Tier[],
  teamTierId: string | null | undefined,
  listingMinTierId: string | null | undefined,
): boolean {
  const teamRank = tierRank(tiers, teamTierId);
  const minRank = tierRank(tiers, listingMinTierId);
  if (teamRank == null || minRank == null) return true;
  return teamRank <= minRank;
}

/** Placeholder avatar used across the scrim UI when a team has none. */
export const FALLBACK_TEAM_AVATAR = "https://i.imgur.com/sFYQQgz.png";

export function tierColor(tier: Tier | null): string | undefined {
  if (!tier?.color) return undefined;
  return `#${tier.color}`;
}

/** Tier "star" emblem by rank: 1 = Champions, 2 = Stellaris, 3 = Genesis. */
const TIER_STAR_BY_RANK: Record<number, string> = {
  1: "champions-star",
  2: "stellaris-star",
  3: "genesis-star",
};

/** Public path to a tier's star emblem, or null if no tier. */
export function tierStar(tier: Tier | null): string | null {
  if (!tier) return null;
  const name = TIER_STAR_BY_RANK[tier.rank] ?? "genesis-star";
  return `/images/icons/${name}.svg`;
}
