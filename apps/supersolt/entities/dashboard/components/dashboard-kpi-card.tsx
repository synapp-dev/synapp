"use client";

import * as React from "react";
import { ChevronsDown, ChevronsUp, Crosshair } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { DashboardCountUp } from "@/entities/dashboard/components/dashboard-count-up";
import type { DashboardKpiData } from "@/entities/dashboard/model/dummy-dashboard-data";

const KPI_COUNT_DURATION_S = 1.1;

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
        "flex h-full min-h-0 flex-col gap-0 py-0",
        agentInsight &&
          "cursor-pointer transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <CardContent className="flex min-h-48 flex-1 flex-col justify-between gap-3 p-0 px-6 py-4 md:min-h-30 md:gap-4 md:py-5">
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
    </Card>
  );
}
