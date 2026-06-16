import type {
  ExerciseHistoryEntry,
  MuscleSubgroup,
} from "@/entities/gym/model/types";

// Rule-based strength heuristics. These are intentionally simple starting
// points — they get more useful as real session history accrues, and are the
// natural place to swap in a data-driven model later.

const KG_INCREMENT = 2.5;

/** Epley estimated 1RM for a single set. */
export function estimatedOneRepMax(
  weight: number | null,
  reps: number | null
): number | null {
  if (weight == null || reps == null || reps <= 0) return null;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Best (highest est-1RM) working set across one session's sets. */
export function bestSetOneRepMax(
  sets: { weight: number | null; reps: number | null; isWarmup: boolean }[]
): number | null {
  let best: number | null = null;
  for (const s of sets) {
    if (s.isWarmup) continue;
    const e = estimatedOneRepMax(s.weight, s.reps);
    if (e != null && (best == null || e > best)) best = e;
  }
  return best;
}

export type LoadSuggestion = {
  weight: number | null;
  reps: number;
  /** Short human rationale, e.g. "+2.5 kg — hit top of range last time". */
  reason: string;
};

/**
 * Double-progression next-set suggestion for an exercise.
 *
 * Looks at the most recent session's working sets. If every set reached the top
 * of the rep range at RPE ≤ 8, bump the load and reset to the bottom of the
 * range; otherwise hold the load and add a rep toward the top.
 */
export function suggestNextLoad(
  history: ExerciseHistoryEntry[],
  repMin: number,
  repMax: number,
  intensity: "normal" | "hard" = "normal"
): LoadSuggestion | null {
  const last = history[0];
  if (!last) return null;

  const work = last.sets.filter((s) => !s.isWarmup && s.weight != null && s.reps != null);
  if (work.length === 0) return null;

  const topWeight = Math.max(...work.map((s) => s.weight as number));
  const atTop = work.filter((s) => s.weight === topWeight);
  const allHitTopReps = atTop.every((s) => (s.reps as number) >= repMax);
  const allEasy = atTop.every((s) => s.rpe == null || s.rpe <= 8);

  // "Push hard" days take a bigger jump and will progress even on a steady set.
  const increment = intensity === "hard" ? KG_INCREMENT * 2 : KG_INCREMENT;

  if (allHitTopReps && allEasy) {
    return {
      weight: Math.round((topWeight + increment) * 2) / 2,
      reps: repMin,
      reason:
        intensity === "hard"
          ? `+${increment} kg — push hard, go for a PR`
          : `+${KG_INCREMENT} kg — hit ${repMax} reps last time`,
    };
  }

  if (intensity === "hard") {
    return {
      weight: Math.round((topWeight + increment) * 2) / 2,
      reps: repMin,
      reason: `+${increment} kg — push hard`,
    };
  }

  const lastTopReps = Math.max(...atTop.map((s) => s.reps as number));
  return {
    weight: topWeight,
    reps: Math.min(lastTopReps + 1, repMax),
    reason:
      lastTopReps >= repMax
        ? `Hold ${topWeight} kg — keep ${repMax} reps`
        : `Hold ${topWeight} kg — aim for ${Math.min(lastTopReps + 1, repMax)} reps`,
  };
}

// Weekly working-set targets per muscle subgroup (hypertrophy landmarks). Used
// to back the recommended set count per exercise in a program.
export const SUBGROUP_VOLUME_TARGETS: Record<MuscleSubgroup, number> = {
  chest_upper: 6,
  chest_middle: 6,
  chest_lower: 4,
  back_lats: 9,
  back_traps: 6,
  back_lower: 4,
  delts_front: 4,
  delts_side: 8,
  delts_rear: 6,
  biceps: 10,
  triceps: 10,
  forearms: 6,
  abs: 8,
  obliques: 6,
  serratus: 4,
  quads: 10,
  hamstrings: 9,
  glutes: 9,
  adductors: 4,
  calves: 9,
  tibialis: 4,
};

/**
 * Recommended set count for one exercise in a program.
 *
 * Splits the subgroup's weekly target across the exercises hitting it and the
 * number of weekly sessions that train it, then nudges +1 if the lift has
 * stalled (no est-1RM improvement over the last 3 logged sessions).
 */
export function recommendSetCount(params: {
  subgroup: MuscleSubgroup;
  exercisesForSubgroup: number;
  sessionsPerWeekForSubgroup: number;
  history?: ExerciseHistoryEntry[];
}): { sets: number; reason: string } {
  const { subgroup, exercisesForSubgroup, sessionsPerWeekForSubgroup, history } = params;
  const weekly = SUBGROUP_VOLUME_TARGETS[subgroup] ?? 8;
  const denom = Math.max(1, exercisesForSubgroup) * Math.max(1, sessionsPerWeekForSubgroup);

  let sets = Math.round(weekly / denom);
  let reason = `≈${weekly} weekly sets for ${subgroup}, split across your plan`;

  if (isStalled(history)) {
    sets += 1;
    reason = `Stalled recently — added a set (${weekly} weekly target)`;
  }

  // Clamp to a sane working range.
  sets = Math.min(5, Math.max(2, sets));
  return { sets, reason };
}

/** True when est-1RM hasn't improved across the last 3 logged sessions. */
function isStalled(history?: ExerciseHistoryEntry[]): boolean {
  if (!history || history.length < 3) return false;
  const recent = history.slice(0, 3).map((h) =>
    bestSetOneRepMax(h.sets.map((s) => ({ ...s, isWarmup: s.isWarmup })))
  );
  if (recent.some((e) => e == null)) return false;
  const [newest, mid, oldest] = recent as [number, number, number];
  // No meaningful progress if newest isn't above the older two.
  return newest <= mid && newest <= oldest;
}
