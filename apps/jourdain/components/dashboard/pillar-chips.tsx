"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { TaskDomain } from "@/entities/tasks/model/types";
import type { PillarScore } from "@/lib/scoring/compute";

// Same pillar hues as the tasks board so the app reads as one system.
const PILLAR_META: Record<TaskDomain, { label: string; dot: string; bar: string }> = {
  identity: { label: "Identity", dot: "bg-violet-500", bar: "bg-violet-500" },
  health: { label: "Health", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  work: { label: "Work", dot: "bg-blue-500", bar: "bg-blue-500" },
  social: { label: "Social", dot: "bg-amber-500", bar: "bg-amber-500" },
  finance: { label: "Finance", dot: "bg-rose-500", bar: "bg-rose-500" },
};

function Chip({ pillar }: { pillar: PillarScore }) {
  const meta = PILLAR_META[pillar.pillar];
  const neutral = pillar.score === null;

  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border border-border/60 bg-card px-3 py-2 transition-opacity",
        neutral && "opacity-45"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
          <span className="truncate text-xs font-medium">{meta.label}</span>
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {neutral ? "Rest" : `${pillar.completed}/${pillar.total}`}
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
        {!neutral ? (
          <div
            className={cn("h-full rounded-full transition-[width] duration-700", meta.bar)}
            style={{ width: `${pillar.score}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}

/** The five pillar mini-cards beside the score ring; neutral pillars go muted. */
export function PillarChips({ pillars }: { pillars: PillarScore[] }) {
  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {pillars.map((pillar) => (
        <Chip key={pillar.pillar} pillar={pillar} />
      ))}
    </div>
  );
}
