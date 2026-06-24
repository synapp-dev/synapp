/**
 * Canonical CS2 player roles/positions. Client-safe (no server imports) so the Play
 * card, future roster panels, and validation share one source of truth.
 *
 * POSITION_IDS must stay in sync with the `team_positions_position_chk` CHECK in
 * migration 0033 / the teamPositions Drizzle def (server/db/schema.ts).
 */

export const POSITION_IDS = [
  "igl",
  "awper",
  "entry",
  "rifler",
  "support",
  "lurker",
] as const;

export type PositionId = (typeof POSITION_IDS)[number];

/** Display label per role (badge/card text). */
export const POSITION_LABELS: Record<PositionId, string> = {
  igl: "IGL",
  awper: "AWPer",
  entry: "Entry",
  rifler: "Rifler",
  support: "Support",
  lurker: "Lurker",
};

export function isPositionId(value: string): value is PositionId {
  return (POSITION_IDS as readonly string[]).includes(value);
}

/** Safe label lookup — returns the label for a known id, else null. */
export function positionLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return isPositionId(value) ? POSITION_LABELS[value] : null;
}
