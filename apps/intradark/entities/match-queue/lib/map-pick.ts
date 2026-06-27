/**
 * Pure map-selection logic (no server-only / no DB import) so it stays unit-testable, mirroring
 * how `team-balance.ts` holds the pure logic that `matchmaker.ts` orchestrates. The DB action
 * `autoPickMap` lives in `auto-pick-map.ts` and imports from here.
 */

/**
 * Default tier pool for the slice. Per-tier pools come from `league_configs.map_pool`
 * post-slice (see docs/pug-match-loop-build-decisions.md §3); until then every tier
 * auto-picks from Active Duty.
 */
export const DEFAULT_MAP_POOL_SLUG = "active_duty";

/**
 * Deterministic pick: index = floor(roll * len), with `roll` ∈ [0, 1).
 * `roll = 1` clamps to the last index (no out-of-bounds).
 */
export function selectMapSlug(slugs: readonly string[], roll: number): string {
  if (slugs.length === 0) {
    throw new Error("Cannot pick a map from an empty pool");
  }
  const idx = Math.min(slugs.length - 1, Math.max(0, Math.floor(roll * slugs.length)));
  return slugs[idx]!;
}
