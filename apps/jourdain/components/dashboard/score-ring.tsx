"use client";

import { cn } from "@workspace/ui/lib/utils";
import { useCountUp } from "@/hooks/use-count-up";
import { scoreBand } from "@/lib/scoring/bands";

const SIZE = 156;
const STROKE = 11;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const RING_CLASS = {
  high: "text-emerald-500",
  mid: "text-amber-500",
  low: "text-rose-500",
} as const;

function ringColor(score: number): string {
  return RING_CLASS[scoreBand(score)];
}

/** Animated daily-score ring: the arc sweeps in as the number counts up. */
export function ScoreRing({
  score,
  label = "Today",
}: {
  score: number | null;
  label?: string;
}) {
  const animated = useCountUp(score ?? 0, { duration: 1400, delay: 200 });
  const progress = score === null ? 0 : Math.min(1, animated / 100);

  return (
    <div
      className="relative shrink-0"
      style={{ width: SIZE, height: SIZE }}
      role="img"
      aria-label={
        score === null
          ? `No score yet (${label})`
          : `${label} score: ${score} out of 100`
      }
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-muted/70"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          className={cn(
            "stroke-current",
            score === null ? "text-muted" : ringColor(score)
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold tracking-tight tabular-nums">
          {score === null ? "··" : Math.round(animated)}
        </span>
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}
