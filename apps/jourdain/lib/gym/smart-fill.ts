import {
  MUSCLE_SUBGROUPS,
  type Exercise,
  type MuscleSubgroup,
} from "@/entities/gym/model/types";
import { recommendSetCount } from "@/lib/gym/recommend";
import type { Assessment } from "@/lib/gym/muscle-status";

// Builds a session's exercise list for a "smart" program: pick exercises that
// hit the muscle subgroups chosen for the day (e.g. chest + triceps for push),
// prioritising the subgroups the lifter is most behind on, rotating away from
// what was done last time. Pure — the server feeds it the library, current
// assessments and recent exercise ids.

export const DEFAULT_SMART_SIZE = 6;

export type SmartPick = {
  exerciseId: string;
  subgroup: MuscleSubgroup;
  targetSets: number;
  reason: string;
};

export function generateSmartSession(params: {
  subgroups: MuscleSubgroup[];
  exercises: Exercise[];
  /** Per-subgroup training assessment (from assessSubgroups). */
  assessments: Record<MuscleSubgroup, Assessment>;
  /** Exercise ids done in the last session(s) of this program — deprioritised. */
  recentExerciseIds?: string[];
  size?: number;
}): SmartPick[] {
  const { subgroups, exercises, assessments, recentExerciseIds = [], size = DEFAULT_SMART_SIZE } = params;
  if (subgroups.length === 0) return [];
  const subSet = new Set(subgroups);
  const recent = new Set(recentExerciseIds);

  // The chosen subgroups, worst-first (lowest score, then stalest). Keep
  // taxonomy order as a stable tiebreak.
  const targetSubs = MUSCLE_SUBGROUPS.filter((s) => subSet.has(s));
  targetSubs.sort((a, b) => {
    const sa = assessments[a]?.score ?? 0;
    const sb = assessments[b]?.score ?? 0;
    if (sa !== sb) return sa - sb;
    return (assessments[b]?.staleDays ?? 0) - (assessments[a]?.staleDays ?? 0);
  });

  // Only exercises whose primary subgroup is targeted (e.g. triceps, not biceps).
  const library = exercises.filter((e) => !e.archived && subSet.has(e.subgroup));
  const bySub = new Map<MuscleSubgroup, Exercise[]>();
  for (const e of library) {
    const arr = bySub.get(e.subgroup) ?? [];
    arr.push(e);
    bySub.set(e.subgroup, arr);
  }

  const picks: SmartPick[] = [];
  const used = new Set<string>();

  // Rotation dominates (skip lifts done recently) but favourites get a strong
  // nudge — so a not-recent favourite beats a not-recent non-favourite, while a
  // recently-done favourite still yields to fresh alternatives for variety.
  const score = (e: Exercise) => (recent.has(e.id) ? 0 : 10) + (e.isFavourite ? 3 : 0);

  const take = (sub: MuscleSubgroup): boolean => {
    const cands = (bySub.get(sub) ?? []).filter((e) => !used.has(e.id));
    if (cands.length === 0) return false;
    const ex = [...cands].sort((a, b) => score(b) - score(a))[0];
    if (!ex) return false;
    used.add(ex.id);
    const { sets, reason } = recommendSetCount({
      subgroup: sub,
      exercisesForSubgroup: picks.filter((p) => p.subgroup === sub).length + 1,
      sessionsPerWeekForSubgroup: 1,
    });
    picks.push({ exerciseId: ex.id, subgroup: sub, targetSets: sets, reason });
    return true;
  };

  // First pass: one exercise for the most-behind subgroups (priority + cohesion).
  for (const sub of targetSubs) {
    if (picks.length >= size) break;
    take(sub);
  }
  // Second pass: add volume to the worst subgroups until we hit the size target.
  let guard = 0;
  while (picks.length < size && guard < targetSubs.length * 2) {
    take(targetSubs[guard % targetSubs.length]!);
    guard++;
  }

  return picks.slice(0, size);
}
