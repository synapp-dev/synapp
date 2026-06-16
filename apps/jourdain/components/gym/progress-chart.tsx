"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { useExerciseHistory } from "@/hooks/gym/use-gym";
import { bestSetOneRepMax } from "@/lib/gym/recommend";
import { STRENGTH_LEVEL_META, type Thresholds } from "@/lib/gym/standards";

function shortDate(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM");
  } catch {
    return iso;
  }
}

const config = {
  e1rm: { label: "Est. 1RM", color: "var(--chart-1)" },
} satisfies ChartConfig;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
function lerpHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const m = ca.map((v, i) => Math.round(v + (cb[i]! - v) * t));
  return `#${m.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Vertical gradient stops mapping est-1RM height → strength-grade colour, so the
 * trend climbs through untrained → beginner → … → elite as it rises. Offsets are
 * in objectBoundingBox space (0 = top/highest value, 1 = bottom/lowest); the
 * y-domain is pinned to [minVal, maxVal] so this maps exactly onto the line.
 */
function gradeStops(
  thresholds: Thresholds,
  minVal: number,
  maxVal: number
): { offset: number; color: string }[] {
  const span = maxVal - minVal || 1;
  const scale = [
    { v: 0, c: STRENGTH_LEVEL_META.untrained.color },
    { v: thresholds.beginner, c: STRENGTH_LEVEL_META.beginner.color },
    { v: thresholds.novice, c: STRENGTH_LEVEL_META.novice.color },
    { v: thresholds.intermediate, c: STRENGTH_LEVEL_META.intermediate.color },
    { v: thresholds.advanced, c: STRENGTH_LEVEL_META.advanced.color },
    { v: thresholds.elite, c: STRENGTH_LEVEL_META.elite.color },
  ];
  const colorAt = (v: number): string => {
    if (v <= scale[0]!.v) return scale[0]!.c;
    for (let i = 1; i < scale.length; i++) {
      if (v <= scale[i]!.v) {
        const lo = scale[i - 1]!;
        const hi = scale[i]!;
        const t = (v - lo.v) / ((hi.v - lo.v) || 1);
        return lerpHex(lo.c, hi.c, t);
      }
    }
    return scale[scale.length - 1]!.c; // above elite
  };
  const vals = new Set<number>([maxVal, minVal]);
  for (const s of scale) if (s.v > minVal && s.v < maxVal) vals.add(s.v);
  return [...vals]
    .sort((a, b) => b - a) // high value → low value = ascending offset
    .map((v) => ({ offset: (maxVal - v) / span, color: colorAt(v) }));
}

/** Estimated-1RM trend + headline PR for one exercise. */
export function ProgressChart({
  exerciseId,
  name,
  embedded = false,
  thresholds,
  fill = false,
  animate = true,
}: {
  exerciseId: string;
  name: string;
  /** Render just the chart (no Card, no header) for use inside a combined card. */
  embedded?: boolean;
  /** Strength-grade thresholds (kg) at the lifter's bodyweight — colours the line
   *  by grade when provided. */
  thresholds?: Thresholds;
  /** Fill the parent's height instead of using a fixed 3:1 aspect ratio (used
   *  when the chart sits next to the benchmarks and should match their height). */
  fill?: boolean;
  /** When false, draw the line instantly with no sweep-in (muted, inactive cards). */
  animate?: boolean;
}) {
  const sizeClass = fill ? "h-full w-full" : "aspect-[3/1] w-full";
  const { data: history, isLoading } = useExerciseHistory(exerciseId);

  const points = useMemo(() => {
    return (history ?? [])
      .map((h) => ({
        date: h.performedOn,
        e1rm: bestSetOneRepMax(h.sets),
        volume: h.sets
          .filter((s) => !s.isWarmup && s.weight != null && s.reps != null)
          .reduce((sum, s) => sum + (s.weight as number) * (s.reps as number), 0),
      }))
      .filter((p) => p.e1rm != null)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((p) => ({ ...p, e1rm: Math.round((p.e1rm as number) * 10) / 10 }));
  }, [history]);

  const best = points.length > 0 ? Math.max(...points.map((p) => p.e1rm)) : null;
  const latestVolume = points.at(-1)?.volume ?? null;

  // Pin the y-domain to the data range so the grade gradient (objectBoundingBox)
  // lines up with the curve; a touch of headroom on top keeps the peak off the edge.
  const minVal = points.length ? Math.min(...points.map((p) => p.e1rm)) : 0;
  const maxVal = best ?? 0;
  const stops = useMemo(
    () => (thresholds && points.length > 1 ? gradeStops(thresholds, minVal, maxVal) : null),
    [thresholds, minVal, maxVal, points.length]
  );
  const gradId = `e1rm-grade-${exerciseId}`;
  const strokeColor = stops ? `url(#${gradId})` : "var(--color-e1rm)";

  const chart =
    points.length > 1 ? (
      <ChartContainer config={config} className={sizeClass}>
        <AreaChart data={points} margin={{ left: 4, right: 4, top: 4 }}>
          {stops ? (
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                {stops.map((s, i) => (
                  <stop key={i} offset={`${Math.round(s.offset * 1000) / 10}%`} stopColor={s.color} />
                ))}
              </linearGradient>
            </defs>
          ) : null}
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tickLine={false}
            axisLine={false}
            minTickGap={32}
            hide={fill}
          />
          <YAxis hide domain={stops ? [minVal, maxVal + (maxVal - minVal || 1) * 0.08] : ["auto", "auto"]} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(v) => shortDate(String(v))}
                formatter={(value) => `${value} kg`}
              />
            }
          />
          <Area
            dataKey="e1rm"
            type="monotone"
            stroke={strokeColor}
            fill={strokeColor}
            fillOpacity={0.15}
            strokeWidth={2}
            isAnimationActive={animate}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ChartContainer>
    ) : (
      <div className={`flex ${sizeClass} items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground`}>
        Log this lift a couple of times to see your strength trend
      </div>
    );

  if (embedded) return chart;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="text-xs text-muted-foreground">
              {best != null
                ? `Best est. 1RM ${best} kg`
                : isLoading
                  ? "Loading…"
                  : "No logged sets yet"}
            </p>
          </div>
          {latestVolume != null && latestVolume > 0 ? (
            <div className="shrink-0 text-right">
              <p className="text-xs text-muted-foreground">Last volume</p>
              <p className="text-sm font-semibold tabular-nums">
                {Math.round(latestVolume).toLocaleString()} kg
              </p>
            </div>
          ) : null}
        </div>

        {chart}
      </CardContent>
    </Card>
  );
}
