"use client";

import * as React from "react";
import { ChevronsDown, ChevronsUp } from "lucide-react";
import { Area, AreaChart, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { SquareWordmark } from "@/components/branding/square-wordmark";
import { DashboardCountUp } from "@/entities/dashboard/components/dashboard-count-up";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import type {
  DashboardHeroData,
  DashboardNetRevenuePoint,
} from "@/entities/dashboard/model/dummy-dashboard-data";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--brand-supersolt-primary)",
  },
  expenses: {
    label: "Expenses",
    color: "#ffffff",
  },
} satisfies ChartConfig;

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Stable ids — avoid `useId()` so SSR/hydration matches after layout hook changes. */
const NET_REVENUE_CHART_ID = "net-revenue-hero";
const FILL_REVENUE_ID = "fillRevenue-net-revenue-hero";
const FILL_EXPENSES_ID = "fillExpenses-net-revenue-hero";

/** Area draw duration (ms) = headline `DashboardCountUp` `duration` (s). */
const HERO_VALUE_ANIMATION_MS = 1750;

type NetRevenueHeroCardProps = {
  hero: DashboardHeroData;
  series: DashboardNetRevenuePoint[];
  dataSource?: "square" | "demo";
};

type HeroChartPoint = DashboardNetRevenuePoint & { isPad?: boolean };

function withStartPadding(
  points: DashboardNetRevenuePoint[],
): HeroChartPoint[] {
  const padStart: HeroChartPoint = {
    label: "__padStart",
    revenue: 0,
    expenses: 0,
    isPad: true,
  };
  return [padStart, ...points];
}

export function NetRevenueHeroCard({
  hero,
  series,
  dataSource = "demo",
}: NetRevenueHeroCardProps) {
  const chartData = React.useMemo(() => withStartPadding(series), [series]);

  const [deltaBadgeVisible, setDeltaBadgeVisible] = React.useState(false);

  React.useEffect(() => {
    setDeltaBadgeVisible(false);
  }, [
    hero.countUpEnd,
    hero.countUpDecimals,
    hero.deltaPercent,
    hero.deltaDirection,
  ]);

  return (
    <Card
      className={cn(
        "relative gap-0 overflow-hidden border-emerald-950/50 bg-emerald-950 py-0 text-green-50 shadow-md",
        "dark:border-emerald-400/35 dark:bg-emerald-50 dark:text-slate-900",
      )}
    >
      <div
        aria-hidden
        className="net-revenue-hero-shifting-blobs pointer-events-none absolute inset-0 z-0"
      />
      <CardContent className="relative z-10 grid min-h-[156px] grid-cols-1 p-0 px-0 md:min-h-[200px] md:grid-cols-5 md:items-stretch">
        <div className="flex min-h-0 flex-col justify-between gap-4 px-6 py-4 md:col-span-2 md:h-full md:py-5">
          <div className="flex flex-wrap items-center gap-2">
            <CardDescription className="text-xs uppercase tracking-wider text-emerald-200/90 dark:text-slate-600">
              {hero.metricLabel} · {hero.periodLabel}
            </CardDescription>
            {dataSource === "square" ? (
              <Badge
                variant="secondary"
                className="border-emerald-400/45 bg-emerald-500/15 px-2 py-0.5 dark:border-emerald-600/50 dark:bg-emerald-600/15"
              >
                <SquareWordmark tone="inverted" className="h-2.5" decorative />
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-emerald-400/30 text-[10px] font-normal text-emerald-200/75 dark:border-slate-900/20 dark:text-slate-600"
              >
                Demo
              </Badge>
            )}
          </div>
          <div className="flex min-w-0 flex-wrap items-start gap-3">
            <CardTitle className="text-6xl leading-none tracking-tight min-w-0 shrink text-white dark:text-slate-950 animate-slide-up-fade-in-slowest">
              <DashboardCountUp
                end={hero.countUpEnd}
                decimals={hero.countUpDecimals}
                duration={HERO_VALUE_ANIMATION_MS / 1000}
                prefix="$"
                separator=","
                onEnd={() => setDeltaBadgeVisible(true)}
              />
            </CardTitle>
            {deltaBadgeVisible ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-fit shrink-0 cursor-help gap-0.5 rounded-full !py-1 px-2 text-xs font-medium opacity-0 animate-slide-left-fade-in-slow [&>svg]:size-3.5",
                      hero.deltaDirection === "up"
                        ? "border-emerald-400/45 bg-emerald-500/15 text-emerald-100 dark:border-emerald-600/50 dark:bg-emerald-600/15 dark:text-emerald-900"
                        : "border-rose-400/45 bg-rose-500/15 text-rose-100 dark:border-red-600/50 dark:bg-red-600/15 dark:text-red-900",
                    )}
                  >
                    {hero.deltaDirection === "up" ? (
                      <ChevronsUp className="size-3.5 shrink-0" />
                    ) : (
                      <ChevronsDown className="size-3.5 shrink-0" />
                    )}
                    <span>{hero.deltaPercent.toFixed(1)}%</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {hero.comparisonLabel}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </div>

        <div className="relative flex min-h-[121px] min-w-0 border-t border-white/10 dark:border-slate-900/10 md:col-span-3 md:h-full md:min-h-0 md:border-t-0">
          <ChartContainer
            id={NET_REVENUE_CHART_ID}
            config={chartConfig}
            className="aspect-auto h-full min-h-[121px] w-full max-w-none flex-1 [&_.recharts-responsive-container]:!h-full"
          >
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 8, right: 0, top: 4, bottom: 0 }}
            >
              <XAxis dataKey="label" type="category" hide />
              <defs>
                <linearGradient id={FILL_EXPENSES_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-expenses)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-expenses)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id={FILL_REVENUE_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-revenue)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-revenue)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <ChartTooltip
                cursor={false}
                content={(tooltipProps) => {
                  const row = tooltipProps.payload?.[0]?.payload as
                    | HeroChartPoint
                    | undefined;
                  if (row?.isPad) {
                    return null;
                  }
                  return (
                    <ChartTooltipContent
                      active={tooltipProps.active}
                      payload={tooltipProps.payload}
                      label={tooltipProps.label}
                      indicator="dot"
                      className={cn(
                        "border-white/15 bg-emerald-950/95 text-green-50 shadow-2xl backdrop-blur-sm",
                        "dark:border-slate-900/12 dark:bg-white/95 dark:text-slate-900",
                      )}
                      labelClassName="text-emerald-200/90 dark:text-slate-600"
                      labelFormatter={(_, payload) => {
                        const label = payload?.[0]?.payload?.label;
                        if (
                          typeof label === "string" &&
                          label.startsWith("__pad")
                        ) {
                          return "";
                        }
                        return label != null ? String(label) : "";
                      }}
                      formatter={(value) =>
                        typeof value === "number"
                          ? currency.format(value)
                          : value
                      }
                    />
                  );
                }}
              />
              <Area
                dataKey="expenses"
                type="natural"
                fill={`url(#${FILL_EXPENSES_ID})`}
                fillOpacity={0.4}
                stroke="var(--color-expenses)"
                strokeWidth={2}
                animationDuration={HERO_VALUE_ANIMATION_MS}
                animationEasing="ease-out"
              />
              <Area
                dataKey="revenue"
                type="natural"
                fill={`url(#${FILL_REVENUE_ID})`}
                fillOpacity={0.4}
                stroke="var(--color-revenue)"
                strokeWidth={2}
                animationDuration={HERO_VALUE_ANIMATION_MS}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
