"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { Card, CardContent } from "@workspace/ui/components/card";
import { AnimatedNumber } from "@/components/gym/animated-number";
import { useExerciseHistory } from "@/hooks/gym/use-gym";
import { bestSetOneRepMax } from "@/lib/gym/recommend";
import {
  assessLift,
  STRENGTH_LEVEL_META,
  type LiftAssessment,
} from "@/lib/gym/standards";
import {
  STRENGTH_LEVELS,
  type ExerciseStandards,
  type Sex,
  type StrengthLevel,
} from "@/entities/gym/model/types";

const LEVEL_LABEL: Record<StrengthLevel, string> = {
  beginner: "Beg",
  novice: "Nov",
  intermediate: "Int",
  advanced: "Adv",
  elite: "Elite",
};

// Fraction across the whole bar (untrained → elite), 5 even bands plus the
// partial progress within the current band.
const BAR_ORDER = ["untrained", ...STRENGTH_LEVELS] as const;
function barFraction(a: { standing: string; nextLevel: StrengthLevel | null; progressToNext: number }): number {
  const idx = BAR_ORDER.indexOf(a.standing as (typeof BAR_ORDER)[number]);
  return Math.min(1, idx * 0.2 + (a.nextLevel ? a.progressToNext * 0.2 : 0));
}

/** Best-lift-vs-next-level progress bar (untrained → elite), tinted by band. */
export function StrengthProgressBar({
  assessment,
  bestE1rm,
  animate = true,
}: {
  assessment: LiftAssessment;
  bestE1rm: number | null;
  /** When false, snap straight to the final fill with no count-up / sweep (used
   *  by muted, inactive cards). */
  animate?: boolean;
}) {
  const meta = STRENGTH_LEVEL_META[assessment.standing];
  // Animate the fill from 0 on mount (so it replays each time the card mounts);
  // inactive cards snap straight to the final width.
  const [w, setW] = useState(animate ? 0 : barFraction(assessment) * 100);
  useEffect(() => {
    if (!animate) {
      setW(barFraction(assessment) * 100);
      return;
    }
    const raf = requestAnimationFrame(() => setW(barFraction(assessment) * 100));
    return () => cancelAnimationFrame(raf);
  }, [assessment, animate]);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {bestE1rm != null ? (
            <>
              Best est. 1RM{" "}
              <AnimatedNumber value={Math.round(bestE1rm)} suffix=" kg" animate={animate} />
            </>
          ) : (
            "No sets logged yet"
          )}
        </span>
        {assessment.nextLevel ? (
          <span>
            {STRENGTH_LEVEL_META[assessment.nextLevel].label} @{" "}
            <AnimatedNumber
              value={Math.round(assessment.thresholds[assessment.nextLevel])}
              suffix=" kg"
              animate={animate}
            />
          </span>
        ) : (
          <span className="font-medium text-blue-500">Elite reached 🎉</span>
        )}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${w}%`,
            backgroundColor: meta.color,
            transition: animate ? "width 900ms ease-out" : "none",
          }}
        />
      </div>
    </div>
  );
}

export function StrengthStandards({
  exerciseId,
  name,
  standards,
  bodyweight,
  sex,
  embedded = false,
  hideHeader = false,
  hideBar = false,
  chartSlot,
}: {
  exerciseId: string;
  name: string;
  standards: ExerciseStandards | undefined;
  bodyweight: number | null;
  sex: Sex;
  /** Render without the Card wrapper, for use inside a combined card. */
  embedded?: boolean;
  /** Omit the name/level header (when the parent already renders one). */
  hideHeader?: boolean;
  /** Omit the est-1RM progress bar (when the parent already renders one). */
  hideBar?: boolean;
  /** Slot rendered between the header and the standards body (e.g. the progress chart). */
  chartSlot?: ReactNode;
}) {
  const { data: history } = useExerciseHistory(exerciseId);
  const [showTable, setShowTable] = useState(false);

  const bestE1rm = useMemo(() => {
    const vals = (history ?? []).map((h) => bestSetOneRepMax(h.sets)).filter((v): v is number => v != null);
    return vals.length ? Math.max(...vals) : null;
  }, [history]);

  const latestVolume = useMemo(() => {
    const last = (history ?? [])
      .slice()
      .sort((a, b) => (a.performedOn < b.performedOn ? -1 : 1))
      .at(-1);
    if (!last) return null;
    return last.sets
      .filter((s) => !s.isWarmup && s.weight != null && s.reps != null)
      .reduce((sum, s) => sum + (s.weight as number) * (s.reps as number), 0);
  }, [history]);

  const rows = standards ? standards[sex] : null;
  const assessment = useMemo(
    () => (bodyweight ? assessLift(rows, bodyweight, bestE1rm) : null),
    [rows, bodyweight, bestE1rm]
  );

  // Standalone (non-embedded) card is meaningless without a benchmark.
  if (!standards && !embedded) return null;

  const meta = assessment ? STRENGTH_LEVEL_META[assessment.standing] : null;

  const header = (
    <div className="flex items-center gap-3">
      {standards?.imageUrl ? (
        <Image
          src={standards.imageUrl}
          alt={name}
          width={56}
          height={56}
          className="h-14 w-14 shrink-0 object-contain"
          unoptimized
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="text-xs text-muted-foreground">
          {latestVolume != null && latestVolume > 0
            ? `Last volume ${Math.round(latestVolume).toLocaleString()} kg`
            : "Strength standard"}
        </p>
      </div>
      {meta ? (
        <span
          className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold"
          style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
        >
          {meta.label}
        </span>
      ) : null}
    </div>
  );

  const standardsBody = !standards ? null : !bodyweight ? (
    <p className="text-xs text-muted-foreground">Log your bodyweight above to see your level.</p>
  ) : !rows ? (
    <p className="text-xs text-muted-foreground">No {sex} standards for this lift.</p>
  ) : assessment ? (
    <>
      {hideBar ? null : (
        <StrengthProgressBar assessment={assessment} bestE1rm={bestE1rm} />
      )}

      {/* threshold chips at the lifter's bodyweight */}
      <div className="grid grid-cols-5 gap-1">
        {STRENGTH_LEVELS.map((lvl) => {
          const reached = bestE1rm != null && bestE1rm >= assessment.thresholds[lvl];
          const c = STRENGTH_LEVEL_META[lvl].color;
          return (
            <div
              key={lvl}
              className="rounded-md border p-1.5 text-center"
              style={reached ? { backgroundColor: `${c}1f`, borderColor: `${c}66` } : undefined}
            >
              <div className="text-[10px] font-medium" style={{ color: c }}>
                {LEVEL_LABEL[lvl]}
              </div>
              <div className="text-xs font-semibold tabular-nums">
                {Math.round(assessment.thresholds[lvl])}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowTable((v) => !v)}
        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        {showTable ? "Hide" : "Show"} full table by bodyweight
      </button>
      {showTable ? <FullTable rows={rows} bodyweight={bodyweight} /> : null}
    </>
  ) : null;

  const body = (
    <>
      {hideHeader ? null : header}
      {chartSlot}
      {standardsBody}
    </>
  );

  if (embedded) return body;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">{body}</CardContent>
    </Card>
  );
}

function FullTable({ rows, bodyweight }: { rows: ExerciseStandards["male"]; bodyweight: number }) {
  const first = rows?.[0];
  if (!rows || !first) return null;
  // highlight the row nearest the lifter's bodyweight
  const nearest = rows.reduce((a, r) => (Math.abs(r[0] - bodyweight) < Math.abs(a[0] - bodyweight) ? r : a), first);
  return (
    <div className="max-h-64 overflow-y-auto rounded-md border">
      <table className="w-full text-xs tabular-nums">
        <thead className="sticky top-0 bg-muted/80 backdrop-blur">
          <tr className="text-muted-foreground">
            <th className="px-2 py-1 text-left font-medium">BW</th>
            <th className="px-2 py-1 text-right font-medium">Beg</th>
            <th className="px-2 py-1 text-right font-medium">Nov</th>
            <th className="px-2 py-1 text-right font-medium">Int</th>
            <th className="px-2 py-1 text-right font-medium">Adv</th>
            <th className="px-2 py-1 text-right font-medium">Elite</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className={r === nearest ? "bg-primary/10 font-semibold" : "border-t"}>
              <td className="px-2 py-1 text-left">{r[0]}</td>
              {r.slice(1).map((v, i) => (
                <td key={i} className="px-2 py-1 text-right">{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
