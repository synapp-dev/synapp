"use client";

import { useEffect, useMemo, useState } from "react";
import { Cell, RadialBar, RadialBarChart } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@workspace/ui/lib/utils";

export const LEGITIMACY_CHART_METRICS = [
  "plausibility",
  "establishment",
  "corroboration",
  "karma",
] as const;

export type LegitimacyChartMetric = (typeof LEGITIMACY_CHART_METRICS)[number];

export const METRIC_SHORT_LABELS: Record<LegitimacyChartMetric, string> = {
  plausibility: "Plaus.",
  establishment: "Est.",
  corroboration: "Corr.",
  karma: "Karma",
};

const RING_MIX: Record<LegitimacyChartMetric, number> = {
  plausibility: 40,
  establishment: 55,
  corroboration: 75,
  karma: 100,
};

function ringColor(mixPercent: number): string {
  return `color-mix(in oklch, var(--brand-intradark-primary) ${mixPercent}%, black ${100 - mixPercent}%)`;
}

export const legitimacyChartConfig = {
  score: { label: "Score" },
  plausibility: {
    label: "Plausibility",
    color: ringColor(RING_MIX.plausibility),
  },
  establishment: {
    label: "Establishment",
    color: ringColor(RING_MIX.establishment),
  },
  corroboration: {
    label: "Corroboration",
    color: ringColor(RING_MIX.corroboration),
  },
  karma: { label: "Karma", color: ringColor(RING_MIX.karma) },
} satisfies ChartConfig;

export const METRIC_LABELS: Record<LegitimacyChartMetric, string> = {
  plausibility: legitimacyChartConfig.plausibility.label,
  establishment: legitimacyChartConfig.establishment.label,
  corroboration: legitimacyChartConfig.corroboration.label,
  karma: legitimacyChartConfig.karma.label,
};

export const METRIC_RING_COLORS: Record<LegitimacyChartMetric, string> = {
  plausibility: legitimacyChartConfig.plausibility.color,
  establishment: legitimacyChartConfig.establishment.color,
  corroboration: legitimacyChartConfig.corroboration.color,
  karma: legitimacyChartConfig.karma.color,
};

const RING_FILL_MS = 1200;
const RING_STAGGER_MS = 120;
const DIM_OPACITY = 0.22;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function scoresAtElapsed(
  target: Record<LegitimacyChartMetric, number>,
  elapsedMs: number,
): Record<LegitimacyChartMetric, number> {
  const next = { ...target };
  for (const key of LEGITIMACY_CHART_METRICS) next[key] = 0;

  let allDone = true;
  LEGITIMACY_CHART_METRICS.forEach((metric, index) => {
    const ringElapsed = elapsedMs - index * RING_STAGGER_MS;
    if (ringElapsed <= 0) {
      allDone = false;
      return;
    }
    const progress = Math.min(1, ringElapsed / RING_FILL_MS);
    next[metric] = target[metric] * easeOutCubic(progress);
    if (progress < 1) allDone = false;
  });

  return allDone ? target : next;
}

function sectorOpacity(
  metric: LegitimacyChartMetric,
  activeMetric: LegitimacyChartMetric | null,
): number {
  if (!activeMetric) return 1;
  return activeMetric === metric ? 1 : DIM_OPACITY;
}

export interface LegitimacyRadialChartProps {
  scores: Record<LegitimacyChartMetric, number>;
  className?: string;
  /** Seconds before fill animation starts. */
  delay?: number;
  size?: "sm" | "header" | "md";
  activeMetric?: LegitimacyChartMetric | null;
  onActiveMetricChange?: (metric: LegitimacyChartMetric | null) => void;
}

/** Matches original VeritasSummary chart cap in player-header. */
const HEADER_CHART_SIZE =
  "calc(var(--player-header-height, 240px) * 0.82)";

export function LegitimacyRadialChart({
  scores,
  className,
  delay = 0,
  size = "sm",
  activeMetric = null,
  onActiveMetricChange,
}: LegitimacyRadialChartProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [animated, setAnimated] = useState<Record<LegitimacyChartMetric, number>>(
    () =>
      prefersReducedMotion
        ? scores
        : Object.fromEntries(
            LEGITIMACY_CHART_METRICS.map((m) => [m, 0]),
          ) as Record<LegitimacyChartMetric, number>,
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimated(scores);
      return;
    }

    setAnimated(
      Object.fromEntries(
        LEGITIMACY_CHART_METRICS.map((m) => [m, 0]),
      ) as Record<LegitimacyChartMetric, number>,
    );

    let rafId = 0;
    let startTimeoutId = 0;
    let cancelled = false;

    const runSequence = () => {
      const sequenceStart = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const elapsed = now - sequenceStart;
        setAnimated(scoresAtElapsed(scores, elapsed));
        const totalDuration =
          (LEGITIMACY_CHART_METRICS.length - 1) * RING_STAGGER_MS + RING_FILL_MS;
        if (elapsed < totalDuration) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    };

    const frameId = requestAnimationFrame(() => {
      startTimeoutId = window.setTimeout(() => {
        requestAnimationFrame(runSequence);
      }, delay * 1000);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(rafId);
      window.clearTimeout(startTimeoutId);
    };
  }, [delay, prefersReducedMotion, scores]);

  const chartData = useMemo(
    () =>
      LEGITIMACY_CHART_METRICS.map((metric) => ({
        metric,
        score: animated[metric],
        fill: `var(--color-${metric})`,
      })),
    [animated],
  );

  const sizeClass =
    size === "md"
      ? "h-[9rem] w-[9rem] sm:h-[10rem] sm:w-[10rem]"
      : size === "header"
        ? "aspect-square shrink-0"
        : "h-[5.5rem] w-[5.5rem] sm:h-[6rem] sm:w-[6rem]";

  const chartStyle =
    size === "header"
      ? ({ height: HEADER_CHART_SIZE, width: HEADER_CHART_SIZE } as const)
      : undefined;

  const innerRadius = size === "sm" ? 16 : "24%";
  const outerRadius = size === "sm" ? 42 : "92%";

  return (
    <ChartContainer
      config={legitimacyChartConfig}
      className={cn(
        "aspect-square shrink-0",
        size !== "header" && sizeClass,
        "[&_.recharts-radial-bar-background-sector]:fill-[color-mix(in_oklch,var(--brand-intradark-primary)_12%,transparent)]",
        "[&_.recharts-radial-bar-background-sector]:transition-opacity [&_.recharts-radial-bar-sector]:transition-opacity",
        activeMetric &&
          "[&_.recharts-radial-bar-background-sector]:opacity-[0.18]",
        className,
      )}
      style={chartStyle}
    >
      <RadialBarChart
        data={chartData}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={90}
        endAngle={-270}
      >
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel nameKey="metric" />}
        />
        <RadialBar dataKey="score" background isAnimationActive={false}>
          {chartData.map((entry) => {
            const opacity = sectorOpacity(entry.metric, activeMetric);
            return (
              <Cell
                key={entry.metric}
                fillOpacity={opacity}
                style={{ cursor: onActiveMetricChange ? "pointer" : undefined }}
                onMouseEnter={() => onActiveMetricChange?.(entry.metric)}
              />
            );
          })}
        </RadialBar>
      </RadialBarChart>
    </ChartContainer>
  );
}

export function axisScoresFromBreakdown(
  axes: Record<string, { score: number }> | undefined,
): Record<LegitimacyChartMetric, number> {
  return {
    plausibility: axes?.plausibility?.score ?? 0,
    establishment: axes?.establishment?.score ?? 0,
    corroboration: axes?.corroboration?.score ?? 0,
    karma: axes?.karma?.score ?? 0,
  };
}
