/**
 * Pure prize-pool splitting (plan §8). Given a pool and a list of percentages,
 * return integer payouts that sum exactly to the pool (remainder to the top
 * placement). No DB imports → unit-testable.
 */

export function splitPool(pool: number, percentages: number[]): number[] {
  if (pool <= 0 || percentages.length === 0) return percentages.map(() => 0);
  const total = percentages.reduce((a, b) => a + b, 0) || 1;
  const raw = percentages.map((p) => Math.floor((pool * p) / total));
  const distributed = raw.reduce((a, b) => a + b, 0);
  const remainder = pool - distributed;
  if (raw.length > 0) raw[0]! += remainder; // top placement absorbs rounding
  return raw;
}
