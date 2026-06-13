"use client";

import { useMemo, useState } from "react";
import { track } from "@vercel/analytics/react";
import { ShieldCheck } from "lucide-react";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { LegitimacyBreakdownDialog } from "@/entities/players/components/legitimacy-breakdown-dialog";
import {
  LEGITIMACY_CHART_METRICS,
  LegitimacyRadialChart,
  METRIC_LABELS,
  METRIC_RING_COLORS,
  axisScoresFromBreakdown,
  type LegitimacyChartMetric,
} from "@/entities/players/components/legitimacy-radial-chart";
import { useGetLegitimacyScore } from "@/entities/players/hooks/queries";
import type { LegitimacyTier } from "@/entities/players/lib/legitimacy";

const CONFIDENCE_LABELS = {
  low: "Low confidence",
  med: "Med confidence",
  high: "High confidence",
} as const;

const DIM_CLASS = "opacity-[0.22] scale-[0.98]";
const HIGHLIGHT_CLASS = "opacity-100 ring-1 ring-white/25";

const CARD_SHELL_CLASS =
  "flex h-full min-h-0 cursor-pointer flex-col overflow-hidden rounded-lg border border-white/10 bg-black/25 text-white shadow-none backdrop-blur-sm transition-colors hover:bg-black/35";

export interface LegitimacySummaryProps {
  steamid64: string;
  className?: string;
  /** Seconds before chart fill animation starts (sync with header stats). */
  delay?: number;
}

export function LegitimacySummary({
  steamid64,
  className,
  delay = 0,
}: LegitimacySummaryProps) {
  const { data, isLoading, isError, isEnabled } =
    useGetLegitimacyScore(steamid64);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeMetric, setActiveMetric] =
    useState<LegitimacyChartMetric | null>(null);

  const row = data?.data;
  const chartScores = useMemo(
    () => axisScoresFromBreakdown(row?.breakdown?.axes),
    [row?.breakdown?.axes],
  );

  if (isEnabled === false) return null;

  if (isLoading) {
    return (
      <div className={cn(CARD_SHELL_CLASS, className)}>
        <div className="relative flex h-full min-h-0 flex-col p-2 sm:p-3">
          <Skeleton className="absolute left-2 top-2 h-3 w-16 bg-white/10 sm:left-3 sm:top-3" />
          <div className="flex min-h-0 w-full flex-1 flex-row items-center gap-2 sm:gap-3">
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              {LEGITIMACY_CHART_METRICS.map((m) => (
                <Skeleton
                  key={m}
                  className="h-6 w-full rounded-md bg-white/10"
                />
              ))}
            </div>
            <Skeleton
              className="aspect-square shrink-0 rounded-full bg-white/10"
              style={{
                height: "calc(var(--player-header-height, 240px) * 0.82)",
                width: "calc(var(--player-header-height, 240px) * 0.82)",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  const tier = (row?.tier ?? "unverified") as LegitimacyTier;
  const score = row?.score;
  const confidence = row?.confidence ?? "low";
  const pending = !row && !isError;

  function openDialog() {
    setDialogOpen(true);
    void track("player_legitimacy_breakdown_opened", { tier });
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={openDialog}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openDialog();
          }
        }}
        className={cn(CARD_SHELL_CLASS, className)}
      >
        <div
          className="relative flex h-full min-h-0 flex-col p-2 sm:p-3"
          onMouseLeave={() => setActiveMetric(null)}
        >
          <div
            className="absolute left-2 top-2 z-[1] flex items-center gap-0.5 text-[0.6rem] font-light uppercase tracking-wide text-white/55 sm:left-3 sm:top-3"
            aria-hidden
          >
            <ShieldCheck className="size-3 shrink-0 opacity-70" />
            Veritas
          </div>

          <div className="flex min-h-0 w-full flex-1 flex-row items-center gap-2 sm:gap-3">
            {!pending && !isError ? (
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                {LEGITIMACY_CHART_METRICS.map((metric) => {
                  const isActive = activeMetric === metric;
                  const isDimmed = activeMetric != null && !isActive;
                  return (
                    <div
                      key={metric}
                      role="presentation"
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-medium text-white/80 transition-all duration-150 sm:text-[11px]",
                        isDimmed && DIM_CLASS,
                        isActive && HIGHLIGHT_CLASS,
                      )}
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        setActiveMetric(metric);
                      }}
                      onFocus={(e) => {
                        e.stopPropagation();
                        setActiveMetric(metric);
                      }}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: METRIC_RING_COLORS[metric],
                          }}
                          aria-hidden
                        />
                        <span className="leading-tight">
                          {METRIC_LABELS[metric]}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {chartScores[metric]}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="min-w-0 flex-1" />
            )}

            <div className="relative flex h-full shrink-0 items-center justify-center self-center">
              <LegitimacyRadialChart
                scores={chartScores}
                delay={delay}
                size="header"
                activeMetric={activeMetric}
                onActiveMetricChange={setActiveMetric}
              />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-4xl font-bold tabular-nums leading-none sm:text-5xl">
                  {pending ? "—" : isError ? "?" : score}
                </p>
                <p className="mt-0.5 text-[10px] leading-tight text-white/45 sm:text-[11px]">
                  {pending
                    ? "Score pending"
                    : isError
                      ? "Unable to load score"
                      : CONFIDENCE_LABELS[
                          confidence as keyof typeof CONFIDENCE_LABELS
                        ]}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LegitimacyBreakdownDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        row={row ?? null}
      />
    </>
  );
}
