import {
  STRENGTH_LEVELS,
  type LiftStanding,
  type StandardsRow,
  type StrengthLevel,
} from "@/entities/gym/model/types";

// Positions a lift against strengthlevel.com strength standards. The standards
// are a per-bodyweight table of the weight (kg) that marks each level; we
// interpolate that table to the lifter's exact bodyweight, then see which band
// their best est-1RM falls into.

export const STRENGTH_LEVEL_META: Record<
  LiftStanding,
  { label: string; color: string }
> = {
  untrained: { label: "Untrained", color: "#9ca3af" },
  beginner: { label: "Beginner", color: "#ef4444" },
  novice: { label: "Novice", color: "#f97316" },
  intermediate: { label: "Intermediate", color: "#eab308" },
  advanced: { label: "Advanced", color: "#22c55e" },
  elite: { label: "Elite", color: "#3b82f6" },
};

/** The five level thresholds (kg) at a given bodyweight, interpolated from the table. */
export type Thresholds = Record<StrengthLevel, number>;

/**
 * Linearly interpolate the standards table to `bodyweight`, returning the kg
 * threshold for each level. Clamps to the ends of the table.
 */
export function thresholdsAt(
  rows: StandardsRow[] | null | undefined,
  bodyweight: number
): Thresholds | null {
  if (!rows || rows.length === 0 || !(bodyweight > 0)) return null;
  const sorted = [...rows].sort((a, b) => a[0] - b[0]);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return null;

  const pick = (r: StandardsRow): Thresholds => ({
    beginner: r[1],
    novice: r[2],
    intermediate: r[3],
    advanced: r[4],
    elite: r[5],
  });

  if (bodyweight <= first[0]) return pick(first);
  if (bodyweight >= last[0]) return pick(last);

  let lo = first;
  let hi = last;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (a && b && bodyweight >= a[0] && bodyweight <= b[0]) {
      lo = a;
      hi = b;
      break;
    }
  }
  const t = (bodyweight - lo[0]) / (hi[0] - lo[0]);
  const lerp = (a: number, b: number) => Math.round((a + (b - a) * t) * 10) / 10;
  return {
    beginner: lerp(lo[1], hi[1]),
    novice: lerp(lo[2], hi[2]),
    intermediate: lerp(lo[3], hi[3]),
    advanced: lerp(lo[4], hi[4]),
    elite: lerp(lo[5], hi[5]),
  };
}

export type LiftAssessment = {
  standing: LiftStanding;
  thresholds: Thresholds;
  /** The next level up (null at elite). */
  nextLevel: StrengthLevel | null;
  /** 0–1 progress from the current band's floor toward the next level. */
  progressToNext: number;
};

/**
 * Where a lift (best est-1RM, kg) stands against the thresholds for the
 * lifter's bodyweight.
 */
export function assessLift(
  rows: StandardsRow[] | null | undefined,
  bodyweight: number,
  lift: number | null | undefined
): LiftAssessment | null {
  const thresholds = thresholdsAt(rows, bodyweight);
  if (!thresholds) return null;
  if (lift == null || !(lift > 0)) {
    return { standing: "untrained", thresholds, nextLevel: "beginner", progressToNext: 0 };
  }

  // Highest level whose threshold the lift meets.
  let standing: LiftStanding = "untrained";
  for (const lvl of STRENGTH_LEVELS) {
    if (lift >= thresholds[lvl]) standing = lvl;
  }

  // Progress from the current band floor to the next threshold.
  const order: LiftStanding[] = ["untrained", ...STRENGTH_LEVELS];
  const idx = order.indexOf(standing);
  const nextLevel = (order[idx + 1] as StrengthLevel | undefined) ?? null;
  let progressToNext = 1;
  if (nextLevel) {
    const floor = standing === "untrained" ? 0 : thresholds[standing as StrengthLevel];
    const ceil = thresholds[nextLevel];
    progressToNext = ceil > floor ? Math.min(1, Math.max(0, (lift - floor) / (ceil - floor))) : 0;
  }
  return { standing, thresholds, nextLevel, progressToNext };
}
