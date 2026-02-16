import {
  generateNKeysBetween,
  generateKeyBetween,
} from "fractional-indexing";

/**
 * Generate a position string between two positions (or at start/end).
 * Use for inserting a slide at a specific place without reordering all.
 */
export function generatePositionBetween(
  afterPosition: string | null,
  beforePosition: string | null
): string {
  return generateKeyBetween(afterPosition, beforePosition);
}

/**
 * Compute fractional position strings for slides in the given order.
 *
 * @param slideIds - Array of slide IDs in the desired order
 * @returns Array of position strings (e.g. ["a0", "a1", "a0V"])
 */
export function computePositionsForOrder(slideIds: string[]): string[] {
  if (slideIds.length === 0) return [];
  return generateNKeysBetween(null, null, slideIds.length);
}

/**
 * Compare two slides by position (fractional index).
 * Use for sorting slides in display order.
 */
export function compareSlidesByPosition<
  T extends { position: string },
>(a: T, b: T): number {
  return a.position.localeCompare(b.position);
}
