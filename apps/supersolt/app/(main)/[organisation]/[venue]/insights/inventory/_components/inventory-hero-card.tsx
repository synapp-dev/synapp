"use client";

import * as React from "react";
import { ChevronsDown, ChevronsUp } from "lucide-react";
import { Area, AreaChart, XAxis } from "recharts";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { DashboardCountUp } from "@/entities/dashboard/components/dashboard-count-up";

const chartConfig = {
  cost: {
    label: "Consumption cost",
    theme: {
      light: "rgb(129 140 248)", // indigo-400
      dark: "rgb(99 102 241)", // indigo-500
    },
  },
} satisfies ChartConfig;

const HERO_CHART_ID = "inventory-insights-hero";

/** Area draw duration (ms) = headline `DashboardCountUp` `duration` (s). */
const HERO_VALUE_ANIMATION_MS = 1750;

function formatAud(cents: number): string {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export type InventoryHeroPoint = {
  /** Short label, e.g. "Mon 8". */
  label: string;
  cost: number;
};

export type InventoryHeroCardProps = {
  /** null = no revenue to divide by yet. */
  cogsPercent: number | null;
  /** Percentage-point change vs the prior window; null = no prior window. */
  deltaPp: number | null;
  costCents: number;
  revenueCents: number;
  /** Calendar days in the selected period, for the delta tooltip. */
  periodDays: number;
  points: InventoryHeroPoint[];
  isLoading?: boolean;
  /** Period picker rendered in the card's top-left, beside the kicker. */
  periodControls?: React.ReactNode;
  /** Action buttons rendered in the card's top-right, above the chart. */
  actions?: React.ReactNode;
};

export function InventoryHeroCard({
  cogsPercent,
  deltaPp,
  costCents,
  revenueCents,
  periodDays,
  points,
  isLoading,
  periodControls,
  actions,
}: InventoryHeroCardProps) {
  const [countUpDone, setCountUpDone] = React.useState(false);

  React.useEffect(() => {
    setCountUpDone(false);
  }, [cogsPercent, costCents]);

  const hasChart = points.some((p) => p.cost > 0);
  // For COGS, falling is good news.
  const deltaImproved = deltaPp !== null && deltaPp <= 0;
  const hasDeltaBadge = !isLoading && deltaPp !== null;
  // Badge waits for the count-up so it lands after the headline settles.
  const deltaBadgeVisible = hasDeltaBadge && countUpDone;

  return (
    <Card
      className={cn(
        "relative gap-0 overflow-hidden border-indigo-950/50 bg-indigo-950 py-0 text-indigo-50 shadow-md",
        "dark:border-indigo-400/35 dark:bg-indigo-50 dark:text-slate-900",
      )}
    >
      <div
        aria-hidden
        className="net-revenue-hero-shifting-blobs pointer-events-none absolute inset-0 z-0"
      />
      <CardContent className="relative z-10 flex min-h-[288px] flex-col p-0 md:min-h-[308px]">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 pt-4 md:pt-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <CardDescription className="text-xs uppercase tracking-wider text-indigo-200/90 dark:text-slate-600">
              Theoretical COGS
            </CardDescription>
            <Badge
              variant="outline"
              className="border-indigo-400/30 text-[10px] font-normal text-indigo-200/75 dark:border-slate-900/20 dark:text-slate-600"
            >
              Consumption engine
            </Badge>
            {periodControls ? (
              <div className="flex flex-wrap items-center gap-2">
                {periodControls}
              </div>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>

        <div className="grid flex-1 grid-cols-1 md:grid-cols-5 md:items-stretch">
          <div className="flex min-h-0 flex-col justify-end gap-2.5 px-6 pt-3 pb-4 md:col-span-2 md:pt-4 md:pb-6">
            {hasDeltaBadge ? (
              deltaBadgeVisible ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        "w-fit cursor-help gap-0.5 rounded-full !py-1 px-2 text-xs font-medium opacity-0 animate-slide-up-fade-in-slow [&>svg]:size-3.5",
                        deltaImproved
                          ? "border-emerald-400/45 bg-emerald-500/15 text-emerald-100 dark:border-emerald-600/50 dark:bg-emerald-600/15 dark:text-emerald-900"
                          : "border-rose-400/45 bg-rose-500/15 text-rose-100 dark:border-red-600/50 dark:bg-red-600/15 dark:text-red-900",
                      )}
                    >
                      {deltaImproved ? (
                        <ChevronsDown className="size-3.5 shrink-0" />
                      ) : (
                        <ChevronsUp className="size-3.5 shrink-0" />
                      )}
                      <span>{Math.abs(deltaPp ?? 0).toFixed(1)} pts</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {deltaImproved ? "Down" : "Up"} vs the prior {periodDays}{" "}
                    day{periodDays === 1 ? "" : "s"}; for COGS, lower is better
                  </TooltipContent>
                </Tooltip>
              ) : (
                // Reserve the badge's line before it animates in, so the
                // headline doesn't jump when the badge lands.
                <div aria-hidden className="h-[26px]" />
              )
            ) : (
              <p className="text-xs leading-relaxed text-indigo-200/75 dark:text-slate-600">
                Ingredient cost from real consumption facts against sales in
                the selected period.
              </p>
            )}
            <CardTitle className="text-6xl leading-none tracking-tight text-white md:text-7xl dark:text-slate-950 animate-slide-up-fade-in-slowest">
              {isLoading ? (
                <Skeleton className="h-12 w-52 rounded-lg bg-white/12 md:h-16 md:w-64 dark:bg-slate-900/12" />
              ) : cogsPercent !== null ? (
                <DashboardCountUp
                  end={cogsPercent}
                  decimals={1}
                  duration={HERO_VALUE_ANIMATION_MS / 1000}
                  suffix="%"
                  separator=""
                  onEnd={() => setCountUpDone(true)}
                />
              ) : (
                <DashboardCountUp
                  end={costCents / 100}
                  decimals={0}
                  duration={HERO_VALUE_ANIMATION_MS / 1000}
                  prefix="$"
                  separator=","
                  onEnd={() => setCountUpDone(true)}
                />
              )}
            </CardTitle>
            {isLoading ? null : (
              <p className="text-xs leading-relaxed text-indigo-200/70 dark:text-slate-600">
                {cogsPercent !== null ? (
                  <>
                    <span className="font-medium tabular-nums text-indigo-100 dark:text-slate-900">
                      {formatAud(costCents)}
                    </span>{" "}
                    of ingredients consumed against{" "}
                    <span className="font-medium tabular-nums text-indigo-100 dark:text-slate-900">
                      {formatAud(revenueCents)}
                    </span>{" "}
                    revenue
                  </>
                ) : (
                  "Ingredient cost from real consumption facts. Revenue joins in once sales sync for the same window."
                )}
              </p>
            )}
          </div>

          <div className="relative flex min-h-[130px] min-w-0 border-t border-white/10 md:col-span-3 md:h-full md:min-h-0 md:border-t-0 dark:border-slate-900/10">
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center text-xs text-indigo-200/60 dark:text-slate-500">
                Loading consumption history…
              </div>
            ) : hasChart ? (
              <ChartContainer
                id={HERO_CHART_ID}
                config={chartConfig}
                className="aspect-auto h-full min-h-[130px] w-full max-w-none flex-1 px-3 pt-4 pb-1 [&_.recharts-responsive-container]:!h-full"
              >
                <AreaChart
                  accessibilityLayer
                  data={points}
                  margin={{ left: 4, right: 4, top: 6, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="inventory-hero-cost-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--color-cost)"
                        stopOpacity={0.45}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--color-cost)"
                        stopOpacity={0.04}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval="preserveStartEnd"
                    minTickGap={24}
                    tick={{ fill: "currentColor", opacity: 0.55, fontSize: 11 }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        className={cn(
                          "border-white/15 bg-indigo-950/95 text-indigo-50 shadow-2xl backdrop-blur-sm",
                          "dark:border-slate-900/12 dark:bg-white/95 dark:text-slate-900",
                        )}
                        labelClassName="text-indigo-200/90 dark:text-slate-600"
                        formatter={(value) => (
                          <>
                            <span
                              className="size-2 shrink-0 rounded-[2px]"
                              style={{ background: "var(--color-cost)" }}
                            />
                            <span className="text-indigo-200/90 dark:text-slate-600">
                              Consumed
                            </span>
                            <span className="ml-auto font-medium tabular-nums">
                              {formatAud(Number(value) * 100)}
                            </span>
                          </>
                        )}
                      />
                    }
                  />
                  <Area
                    dataKey="cost"
                    type="monotone"
                    stroke="var(--color-cost)"
                    strokeWidth={2}
                    fill="url(#inventory-hero-cost-fill)"
                    animationDuration={HERO_VALUE_ANIMATION_MS}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex flex-1 items-center justify-center px-6 text-center text-xs text-indigo-200/60 dark:text-slate-500">
                No consumption cost in this period yet. Daily cost appears here
                once sales flow through recipes; map POS items to start the
                engine.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
