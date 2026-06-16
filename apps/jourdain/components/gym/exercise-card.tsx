"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { AnimatedNumber } from "@/components/gym/animated-number";
import { ProgressChart } from "@/components/gym/progress-chart";
import { StrengthProgressBar } from "@/components/gym/strength-standards";
import {
  assessLift,
  STRENGTH_LEVEL_META,
  type Thresholds,
} from "@/lib/gym/standards";
import { STANDING_ORDER } from "@/lib/gym/strength-rating";
import {
  STRENGTH_LEVELS,
  type ExerciseStandards,
  type Sex,
} from "@/entities/gym/model/types";

/** The five level thresholds as a stacked list — label left, count-up kg right. */
function BenchmarkList({
  thresholds,
  best,
  animate = true,
}: {
  thresholds: Thresholds;
  best: number | null;
  animate?: boolean;
}) {
  return (
    <div className="space-y-1">
      {STRENGTH_LEVELS.map((lvl, i) => {
        const c = STRENGTH_LEVEL_META[lvl].color;
        const reached = best != null && best >= thresholds[lvl];
        return (
          <div
            key={lvl}
            className="flex items-center justify-between rounded-md px-2 py-1 text-xs"
            style={reached ? { backgroundColor: `${c}1f` } : undefined}
          >
            <span className="font-medium" style={{ color: c }}>
              {STRENGTH_LEVEL_META[lvl].label}
            </span>
            <AnimatedNumber
              value={Math.round(thresholds[lvl])}
              suffix=" kg"
              delayMs={i * 80}
              className="font-semibold tabular-nums"
              animate={animate}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * One exercise, collapsed by default: name + score + progress trend. Click to
 * expand the full strength-standards breakdown (thresholds, table). The score is
 * the same 0–5 → /100 rescale used everywhere else, derived from the best est-1RM
 * vs the lifter's benchmarks so it stays consistent with the muscle map.
 */
export function ExerciseCard({
  exerciseId,
  name,
  standards,
  best,
  bodyweight,
  sex,
  className,
  expanded,
  animate = true,
  showTrend = true,
}: {
  exerciseId: string;
  name: string;
  standards: ExerciseStandards | undefined;
  best: number | null;
  bodyweight: number | null;
  sex: Sex;
  className?: string;
  /**
   * When provided, the open/closed state is controlled by the parent (e.g. the
   * exercise carousel expands whichever card is centred) and the card no longer
   * toggles on its own click. Omit for the default self-managed behaviour.
   */
  expanded?: boolean;
  /** When false, every count-up / bar / chart renders at its final state with no
   *  animation — used for muted, inactive carousel cards. */
  animate?: boolean;
  /** When false, the trend chart isn't mounted (so its history isn't fetched) —
   *  a placeholder fills its slot. Lets the carousel lazy-load only nearby cards. */
  showTrend?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = expanded !== undefined;
  const open = controlled ? expanded : internalOpen;

  const rows = standards ? standards[sex] : null;
  const assessment = bodyweight ? assessLift(rows, bodyweight, best) : null;
  const meta = assessment ? STRENGTH_LEVEL_META[assessment.standing] : null;
  const score =
    assessment != null
      ? Math.round(
          ((STANDING_ORDER.indexOf(assessment.standing) +
            (assessment.standing === "elite" ? 0 : assessment.progressToNext)) /
            5) *
            100,
        )
      : null;

  const expandable = !!standards && !!bodyweight && !!rows;

  return (
    <Card className={className}>
      <CardContent className="space-y-3 p-3">
        <button
          type="button"
          onClick={() => !controlled && expandable && setInternalOpen((o) => !o)}
          aria-expanded={expandable && !controlled ? open : undefined}
          className={cn(
            "flex w-full items-center gap-3 text-left",
            (!expandable || controlled) && "cursor-default",
          )}
        >
          {standards?.imageUrl ? (
            <Image
              src={standards.imageUrl}
              alt={name}
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 object-contain"
              unoptimized
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{name}</p>
            {meta ? (
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {meta.label}
              </p>
            ) : null}
          </div>
          {score != null && meta ? (
            <AnimatedNumber
              value={score}
              className="text-xl font-bold tabular-nums"
              style={{ color: meta.color }}
              animate={animate}
            />
          ) : null}
          {expandable && !controlled ? (
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          ) : null}
        </button>

        {expandable && assessment ? (
          <>
            {/* Always: the progress bar. */}
            <StrengthProgressBar
              assessment={assessment}
              bestE1rm={best}
              animate={animate}
            />

            {/* Expanded: benchmarks right below the bar, then the trend graph.
                Self-managed cards animate the height open; carousel-controlled
                cards render instantly so the embla layout stays measured. */}
            {controlled ? (
              open ? (
                /* Focused card: benchmarks and the trend graph sit side by side,
                   the graph stretching to match the benchmarks' height. Cards
                   outside the lazy-load window skip the chart (no history fetch)
                   and fill its slot with a placeholder so the height holds. */
                <div className="flex items-stretch gap-4 pt-1">
                  <div className="min-w-0 flex-1">
                    <BenchmarkList
                      thresholds={assessment.thresholds}
                      best={best}
                      animate={animate}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    {showTrend ? (
                      <ProgressChart
                        exerciseId={exerciseId}
                        name={name}
                        embedded
                        fill
                        thresholds={assessment.thresholds}
                        animate={animate}
                      />
                    ) : (
                      <div
                        className="h-full w-full rounded-md bg-muted/30"
                        aria-hidden
                      />
                    )}
                  </div>
                </div>
              ) : null
            ) : (
              <AnimatePresence initial={false}>
                {open ? (
                  <motion.div
                    key="details"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 pt-1">
                      <BenchmarkList thresholds={assessment.thresholds} best={best} />
                      <ProgressChart
                        exerciseId={exerciseId}
                        name={name}
                        embedded
                        thresholds={assessment.thresholds}
                      />
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            )}
          </>
        ) : (
          /* No benchmark for this lift. Mirror the data layout with empty
             placeholders — an empty bar, then (when shown expanded) placeholder
             benchmark rows + an empty trend panel — so the card keeps the same
             height as one with data and the carousel never jumps. */
          <>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">No data</span>
                <span className="text-muted-foreground">N/A</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted" />
            </div>
            {controlled && open ? (
              <div className="flex items-stretch gap-4 pt-1">
                <div className="min-w-0 flex-1 space-y-1">
                  {STRENGTH_LEVELS.map((lvl) => (
                    <div
                      key={lvl}
                      className="flex items-center justify-between rounded-md px-2 py-1 text-xs"
                    >
                      <span className="font-medium text-muted-foreground/50">
                        {STRENGTH_LEVEL_META[lvl].label}
                      </span>
                      <span className="tabular-nums text-muted-foreground/40">
                        —
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-center rounded-md bg-muted/30">
                  <span className="text-xs text-muted-foreground/50">
                    No trend yet
                  </span>
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
