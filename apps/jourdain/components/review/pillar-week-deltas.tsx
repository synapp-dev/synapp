"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { TaskDomain } from "@/entities/tasks/model/types";
import type { PillarWeek } from "@/lib/scoring/weeks";

// Same pillar hues as the dashboard chips so the app reads as one system.
const PILLAR_META: Record<TaskDomain, { label: string; dot: string; bar: string }> = {
  identity: { label: "Identity", dot: "bg-violet-500", bar: "bg-violet-500" },
  health: { label: "Health", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  work: { label: "Work", dot: "bg-blue-500", bar: "bg-blue-500" },
  social: { label: "Social", dot: "bg-amber-500", bar: "bg-amber-500" },
  finance: { label: "Finance", dot: "bg-rose-500", bar: "bg-rose-500" },
};

function DeltaChip({
  score,
  previousScore,
  compareLabel,
}: {
  score: number | null;
  previousScore: number | null;
  compareLabel: string;
}) {
  if (score === null) return null;
  if (previousScore === null) {
    return (
      <span className="text-[11px] font-medium text-muted-foreground">new</span>
    );
  }

  const delta = score - previousScore;
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
        delta > 0 && "text-emerald-500",
        delta < 0 && "text-rose-500",
        delta === 0 && "text-muted-foreground"
      )}
      title={compareLabel}
    >
      <Icon className="h-3 w-3" />
      {delta > 0 ? `+${delta}` : delta}
    </span>
  );
}

/** Per-pillar period averages with the swing against the previous period. */
export function PillarWeekDeltas({
  current,
  previous,
  compareLabel = "vs previous week",
}: {
  current: PillarWeek[];
  previous: PillarWeek[];
  compareLabel?: string;
}) {
  return (
    <div className="space-y-3">
      {current.map((pillar) => {
        const meta = PILLAR_META[pillar.pillar];
        const prev =
          previous.find((p) => p.pillar === pillar.pillar)?.score ?? null;
        const neutral = pillar.score === null;

        return (
          <div
            key={pillar.pillar}
            className={cn("space-y-1.5", neutral && "opacity-45")}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
                <span className="truncate text-xs font-medium">{meta.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <DeltaChip
                  score={pillar.score}
                  previousScore={prev}
                  compareLabel={compareLabel}
                />
                <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">
                  {neutral ? "Rest" : `${pillar.completed}/${pillar.total}`}
                </span>
                <span className="w-8 text-right text-xs font-semibold tabular-nums">
                  {neutral ? "··" : pillar.score}
                </span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              {!neutral ? (
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-700",
                    meta.bar
                  )}
                  style={{ width: `${pillar.score}%` }}
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
