import {
  GROUP_SUBGROUPS,
  MUSCLE_GROUPS,
  MUSCLE_SUBGROUPS,
  SUBGROUP_TO_GROUP,
  type MuscleGroup,
  type MuscleSubgroup,
  type MuscleSummary,
} from "@/entities/gym/model/types";
import { SUBGROUP_VOLUME_TARGETS } from "@/lib/gym/recommend";

// Turns the raw per-subgroup rollup into a single, glanceable training status by
// blending recent volume (vs hypertrophy targets) with the strength trend and
// how recently the muscle was trained. Subgroup assessments roll up to a main
// group assessment for the body map. Thresholds live here so they're easy to
// tune in one place.

export type MuscleStatus = "strong" | "developing" | "behind" | "ignored";

export const STATUS_ORDER: MuscleStatus[] = ["strong", "developing", "behind", "ignored"];

export const STATUS_META: Record<
  MuscleStatus,
  { label: string; color: string; description: string }
> = {
  strong: {
    label: "Strong",
    color: "#22c55e",
    description: "Hitting your weekly volume target and progressing.",
  },
  developing: {
    label: "Developing",
    color: "#f59e0b",
    description: "Getting trained, but below target or holding steady.",
  },
  behind: {
    label: "Needs work",
    color: "#f97316",
    description: "Low volume, stalled, or not trained in a while.",
  },
  ignored: {
    label: "Untrained",
    color: "#ef4444",
    description: "No working sets logged in the last few weeks.",
  },
};

export type Progression = "up" | "flat" | "down" | null;

export type Assessment = {
  status: MuscleStatus;
  /** 0–100 blended score. */
  score: number;
  weeklySets: number;
  targetSets: number;
  volume: number;
  lastTrained: string | null;
  staleDays: number | null;
  progression: Progression;
};

function avg(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function trend(series: { value: number }[]): Progression {
  if (series.length < 2) return null;
  const vals = series.map((p) => p.value);
  const half = Math.max(1, Math.floor(vals.length / 2));
  const older = avg(vals.slice(0, half));
  const recent = avg(vals.slice(-half));
  if (recent > older * 1.02) return "up";
  if (recent < older * 0.98) return "down";
  return "flat";
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO}T00:00:00Z`).getTime();
  const b = new Date(`${toISO}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** Core scorer shared by subgroup and rolled-up group assessments. */
function score(
  weeklySets: number,
  target: number,
  volume: number,
  lastTrained: string | null,
  e1rmSeries: { value: number }[],
  todayISO: string
): Assessment {
  const staleDays = lastTrained ? daysBetween(lastTrained, todayISO) : null;
  const progression = trend(e1rmSeries);

  const volumeRatio = Math.min(1, weeklySets / target);
  const progScore =
    progression === "up" ? 1 : progression === "flat" ? 0.6 : progression === "down" ? 0.25 : 0.5;
  const s = weeklySets <= 0 ? 0 : Math.round((0.7 * volumeRatio + 0.3 * progScore) * 100);

  let status: MuscleStatus;
  if (weeklySets <= 0) status = "ignored";
  else if (staleDays != null && staleDays > 14) status = "behind";
  else if (s >= 72) status = "strong";
  else if (s >= 45) status = "developing";
  else status = "behind";

  return { status, score: s, weeklySets, targetSets: target, volume, lastTrained, staleDays, progression };
}

/** Assess every subgroup, defaulting un-logged ones to "ignored". */
export function assessSubgroups(
  summaries: MuscleSummary[],
  todayISO: string
): Record<MuscleSubgroup, Assessment> {
  const bySub = new Map(summaries.map((s) => [s.subgroup, s]));
  const out = {} as Record<MuscleSubgroup, Assessment>;
  for (const sub of MUSCLE_SUBGROUPS) {
    const sum = bySub.get(sub);
    out[sub] = score(
      sum?.weeklySets ?? 0,
      SUBGROUP_VOLUME_TARGETS[sub] ?? 8,
      sum?.volume ?? 0,
      sum?.lastTrained ?? null,
      sum?.e1rmSeries ?? [],
      todayISO
    );
  }
  return out;
}

/** Roll subgroup summaries up to a main-group assessment (sum volume targets). */
export function assessGroups(
  summaries: MuscleSummary[],
  todayISO: string
): Record<MuscleGroup, Assessment> {
  const byGroup = new Map<MuscleGroup, MuscleSummary[]>();
  for (const s of summaries) {
    const g = SUBGROUP_TO_GROUP[s.subgroup];
    (byGroup.get(g) ?? byGroup.set(g, []).get(g)!).push(s);
  }

  const out = {} as Record<MuscleGroup, Assessment>;
  for (const g of MUSCLE_GROUPS) {
    const subs = byGroup.get(g) ?? [];
    const target = GROUP_SUBGROUPS[g].reduce(
      (n, sub) => n + (SUBGROUP_VOLUME_TARGETS[sub] ?? 8),
      0
    );
    const weeklySets = subs.reduce((n, s) => n + s.weeklySets, 0);
    const volume = subs.reduce((n, s) => n + s.volume, 0);
    const lastTrained = subs.reduce<string | null>(
      (acc, s) => (s.lastTrained && (!acc || s.lastTrained > acc) ? s.lastTrained : acc),
      null
    );
    // Merge all subgroup est-1RM series by date (max), oldest first.
    const merged = new Map<string, number>();
    for (const s of subs)
      for (const p of s.e1rmSeries) {
        const cur = merged.get(p.date);
        if (cur == null || p.value > cur) merged.set(p.date, p.value);
      }
    const series = [...merged.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([, value]) => ({ value }));

    out[g] = score(weeklySets, target, volume, lastTrained, series, todayISO);
  }
  return out;
}
