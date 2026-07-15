"use client";

import * as React from "react";
import { ChevronsDown, ChevronsUp, Crosshair } from "lucide-react";
import { Area, AreaChart, Bar, BarChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  ChartContainer,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { DashboardCountUp } from "@/entities/dashboard/components/dashboard-count-up";
import type {
  DashboardKpiData,
  DashboardKpiSparkline,
  DashboardKpiStatus,
} from "@/entities/dashboard/model/dummy-dashboard-data";

const KPI_COUNT_DURATION_S = 1.1;

const SPARK_COLORS: Record<DashboardKpiStatus, string> = {
  good: "var(--brand-supersolt-primary)",
  watch: "#f59e0b",
  bad: "#f43f5e",
  neutral: "var(--muted-foreground)",
};

/**
 * Decorative full-bleed trend chart along the card's bottom edge.
 * Kept tooltip-free: the card clips overflow, and the headline + delta
 * already carry the numbers.
 */
function KpiSparkline({
  id,
  spark,
  status,
  delaySeconds,
}: {
  id: string;
  spark: DashboardKpiSparkline;
  status: DashboardKpiStatus;
  delaySeconds: number;
}) {
  const color = SPARK_COLORS[status];
  const config = {
    value: { label: spark.label, color },
  } satisfies ChartConfig;
  const fillId = `kpi-spark-fill-${id}`;
  const animationBegin = Math.round(delaySeconds * 1000);

  return (
    <div aria-hidden className="pointer-events-none h-12 w-full">
      <ChartContainer
        id={`kpi-spark-${id}`}
        config={config}
        className="aspect-auto h-full w-full [&_.recharts-responsive-container]:!h-full"
      >
        {spark.kind === "area" ? (
          <AreaChart
            data={spark.points}
            margin={{ left: 0, right: 0, top: 6, bottom: 0 }}
          >
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.45} />
                <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <Area
              dataKey="value"
              type="natural"
              stroke="var(--color-value)"
              strokeWidth={1.5}
              fill={`url(#${fillId})`}
              animationDuration={1200}
              animationBegin={animationBegin}
              animationEasing="ease-out"
            />
          </AreaChart>
        ) : (
          <BarChart
            data={spark.points}
            margin={{ left: 6, right: 6, top: 6, bottom: 0 }}
            barCategoryGap="25%"
          >
            <Bar
              dataKey="value"
              fill="var(--color-value)"
              fillOpacity={0.55}
              radius={[2, 2, 0, 0]}
              animationDuration={1200}
              animationBegin={animationBegin}
              animationEasing="ease-out"
            />
          </BarChart>
        )}
      </ChartContainer>
    </div>
  );
}

/** Text colours matching the net revenue hero delta badge (no pill background). */
function kpiDeltaTextClassName(direction: "up" | "down"): string {
  if (direction === "up") {
    return "text-emerald-900 dark:text-emerald-100";
  }
  return "text-rose-900 dark:text-rose-100";
}

type DashboardKpiCardProps = {
  kpi: DashboardKpiData;
  /**
   * Seconds before the count-up starts — use the same value as the wrapping
   * `StaggeredAnimation` `delaySeconds` so the number animates while the card is visible.
   */
  countUpDelaySeconds?: number;
  /**
   * When set, the card is keyboard-focusable and activates Superbot with dashboard context.
   */
  onRequestAgentInsight?: () => void;
};

export function DashboardKpiCard({
  kpi,
  countUpDelaySeconds = 0,
  onRequestAgentInsight,
}: DashboardKpiCardProps) {
  const [deltaBadgeVisible, setDeltaBadgeVisible] = React.useState(false);

  React.useEffect(() => {
    setDeltaBadgeVisible(false);
  }, [
    kpi.countUpEnd,
    kpi.countUpDecimals,
    kpi.deltaPercent,
    kpi.deltaDirection,
  ]);

  const targetMissed = kpi.targetMissed === true;
  const agentInsight = Boolean(onRequestAgentInsight);

  return (
    <Card
      role={agentInsight ? "button" : undefined}
      tabIndex={agentInsight ? 0 : undefined}
      aria-label={
        agentInsight
          ? `Ask Superbot about ${kpi.title}`
          : undefined
      }
      onClick={agentInsight ? onRequestAgentInsight : undefined}
      onKeyDown={
        agentInsight
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onRequestAgentInsight?.();
              }
            }
          : undefined
      }
      className={cn(
        "flex h-full min-h-0 flex-col gap-0 overflow-hidden py-0",
        agentInsight &&
          "cursor-pointer transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <CardContent
        className={cn(
          "flex min-h-48 flex-1 flex-col justify-between gap-3 p-0 px-6 pt-4 md:min-h-30 md:gap-4 md:pt-5",
          kpi.sparkline ? "pb-2" : "pb-4 md:pb-5",
        )}
      >
        <div className="flex flex-row items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {targetMissed ? (
              <span
                className="relative flex h-2 w-2 shrink-0"
                role="img"
                aria-label="Current value is worse than target"
              >
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"
                  aria-hidden
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"
                  aria-hidden
                />
              </span>
            ) : null}
            <CardDescription className="min-w-0 flex-1 text-xs uppercase tracking-wider text-muted-foreground leading-none">
              {kpi.title}
            </CardDescription>
          </div>
          {kpi.targetDisplay != null && kpi.targetDisplay !== "" ? (
            <div
              className="inline-flex max-w-[min(100%,12rem)] shrink-0 items-center gap-1 text-xs font-medium leading-none"
              aria-label={
                targetMissed
                  ? `Target ${kpi.targetDisplay} — below goal`
                  : `Target ${kpi.targetDisplay}`
              }
            >
              <Crosshair
                className="size-2.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="truncate text-muted-foreground">
                {kpi.targetDisplay}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-wrap items-start gap-2">
          <CardTitle className="min-w-0 shrink text-4xl leading-none tracking-tight">
            <DashboardCountUp
              end={kpi.countUpEnd}
              decimals={kpi.countUpDecimals}
              duration={KPI_COUNT_DURATION_S}
              delay={countUpDelaySeconds}
              prefix={kpi.countUpPrefix}
              suffix={kpi.countUpSuffix}
              separator=""
              onEnd={() => setDeltaBadgeVisible(true)}
            />
          </CardTitle>
          {deltaBadgeVisible ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "inline-flex h-fit shrink-0 cursor-help items-center gap-0 text-xs font-medium opacity-0 animate-slide-left-fade-in-slow [&>svg]:size-3.5",
                    kpiDeltaTextClassName(kpi.deltaDirection),
                  )}
                >
                  {kpi.deltaDirection === "up" ? (
                    <ChevronsUp className="shrink-0" aria-hidden />
                  ) : (
                    <ChevronsDown className="shrink-0" aria-hidden />
                  )}
                  <span>{kpi.deltaPercent.toFixed(1)}%</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8} className="max-w-xs">
                <p className="font-medium leading-snug">
                  Previous week: {kpi.previousWeekDisplay}
                </p>
                <p className="text-muted-foreground mt-1.5 text-xs leading-snug">
                  {kpi.comparisonLabel}
                </p>
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </CardContent>
      {kpi.sparkline ? (
        <KpiSparkline
          id={kpi.id}
          spark={kpi.sparkline}
          status={kpi.status}
          delaySeconds={countUpDelaySeconds}
        />
      ) : null}
    </Card>
  );
}
