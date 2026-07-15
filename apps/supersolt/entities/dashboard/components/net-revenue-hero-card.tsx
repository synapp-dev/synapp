"use client";

import * as React from "react";
import { Check, ChevronDown, ChevronsDown, ChevronsUp, RefreshCw } from "lucide-react";
import { Area, AreaChart, ReferenceDot, ReferenceLine, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
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
import {
  HERO_PERIOD_OPTIONS,
  type HeroPeriodKey,
} from "@/lib/dashboard/hero-period";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--brand-supersolt-primary)",
  },
  forecast: {
    label: "Projected",
    theme: {
      light: "rgb(255 255 255 / 0.55)",
      dark: "rgb(15 23 42 / 0.45)",
    },
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
const FILL_FORECAST_ID = "fillForecast-net-revenue-hero";

/** Area draw duration (ms) = headline `DashboardCountUp` `duration` (s). */
const HERO_VALUE_ANIMATION_MS = 1750;

type NetRevenueHeroCardProps = {
  hero: DashboardHeroData;
  series: DashboardNetRevenuePoint[];
  dataSource?: "square" | "demo";
  /** Selected trailing window; with `onPeriodChange`, the label becomes a picker. */
  periodKey?: HeroPeriodKey;
  onPeriodChange?: (key: HeroPeriodKey) => void;
  /** True while a newly picked period's data is loading. */
  isPeriodLoading?: boolean;
};

type HeroChartPoint = DashboardNetRevenuePoint & { isPad?: boolean };

function withStartPadding(
  points: DashboardNetRevenuePoint[],
): HeroChartPoint[] {
  const padStart: HeroChartPoint = {
    label: "__padStart",
    revenue: 0,
    forecast: points.some((p) => p.forecast !== null) ? 0 : null,
    isPad: true,
  };
  return [padStart, ...points];
}

/**
 * Pulsing marker on the last day with actual trade, shown when the line
 * ends before the window does (pre-open mornings, projected days ahead).
 * SMIL keeps the pulse alive without a JS animation loop; two staggered
 * rings ripple outward continuously around a glowing core.
 */
function FrontierDot({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      {[0, 0.95].map((begin) => (
        <circle
          key={begin}
          cx={cx}
          cy={cy}
          r={8}
          fill="var(--color-revenue)"
          opacity={0}
        >
          <animate
            attributeName="r"
            values="8;24"
            dur="1.9s"
            begin={`${begin}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.5;0"
            dur="1.9s"
            begin={`${begin}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
      <circle cx={cx} cy={cy} r={12} fill="var(--color-revenue)" opacity={0.16} />
      <circle
        cx={cx}
        cy={cy}
        r={7}
        fill="var(--color-revenue)"
        stroke="rgb(255 255 255 / 0.9)"
        strokeWidth={2.5}
      />
    </g>
  );
}

const TODAY_BADGE_WIDTH = 148;
const TODAY_BADGE_HEIGHT = 56;
/** Chip bottom sits this far above the dot centre — just clear of the pulse. */
const TODAY_BADGE_GAP = 26;

/**
 * Glassy "Today" date chip hovering just above the pulsing frontier dot,
 * rendered through a `foreignObject` so it gets real CSS (blur, border,
 * shadow) inside the SVG. Fades down into place once the area draw lands.
 */
function TodayLineBadge({
  cx,
  cy,
  chartWidth,
  dateLabel,
}: {
  cx: number;
  cy: number;
  chartWidth: number;
  dateLabel: string;
}) {
  const half = TODAY_BADGE_WIDTH / 2;
  // Keep the chip inside the plot when the dot sits near an edge.
  const x =
    chartWidth > TODAY_BADGE_WIDTH
      ? Math.min(Math.max(cx, half + 2), chartWidth - half - 2)
      : cx;
  const y = Math.max(2, cy - TODAY_BADGE_GAP - TODAY_BADGE_HEIGHT);
  return (
    <foreignObject
      x={x - half}
      y={y}
      width={TODAY_BADGE_WIDTH}
      height={TODAY_BADGE_HEIGHT}
      className="pointer-events-none overflow-visible"
    >
      <div className="flex h-full flex-col items-center justify-end">
        <div
          className={cn(
            "flex flex-col items-center rounded-lg border border-white/20 bg-white/10 px-3 py-1 shadow-lg shadow-black/20 backdrop-blur-md",
            "opacity-0 animate-slide-down-fade-in-slower",
            "dark:border-slate-900/15 dark:bg-slate-900/10 dark:shadow-slate-900/10",
          )}
          style={{ animationDelay: "1300ms" }}
        >
          <span className="text-[8px] font-semibold uppercase leading-3 tracking-[0.2em] text-emerald-200/90 dark:text-slate-500">
            Today
          </span>
          <span className="whitespace-nowrap text-xs font-semibold leading-tight text-white dark:text-slate-900">
            {dateLabel}
          </span>
        </div>
      </div>
    </foreignObject>
  );
}

export function NetRevenueHeroCard({
  hero,
  series,
  dataSource = "demo",
  periodKey = "7d",
  onPeriodChange,
  isPeriodLoading = false,
}: NetRevenueHeroCardProps) {
  const chartData = React.useMemo(() => withStartPadding(series), [series]);
  const hasForecast = React.useMemo(
    () => series.some((point) => point.forecast !== null),
    [series],
  );

  // Frontier = last point with actual trade; marked with the pulsing dot
  // only when the line stops before the window ends.
  const frontierPoint = React.useMemo((): HeroChartPoint | null => {
    let last: HeroChartPoint | null = null;
    let lastIndex = -1;
    for (let index = 0; index < chartData.length; index += 1) {
      const point = chartData[index]!;
      if (!point.isPad && point.revenue !== null) {
        last = point;
        lastIndex = index;
      }
    }
    return last !== null && lastIndex < chartData.length - 1 ? last : null;
  }, [chartData]);

  const [deltaBadgeVisible, setDeltaBadgeVisible] = React.useState(false);

  React.useEffect(() => {
    setDeltaBadgeVisible(false);
  }, [
    hero.countUpEnd,
    hero.countUpDecimals,
    hero.deltaPercent,
    hero.deltaDirection,
  ]);

  // Plot width for clamping the Today chip inside the chart near the edges.
  const chartAreaRef = React.useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = React.useState(0);
  React.useEffect(() => {
    const el = chartAreaRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setChartWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Resolved on the client so SSR markup never bakes in the server's date.
  const [todayDateLabel, setTodayDateLabel] = React.useState<string | null>(
    null,
  );
  React.useEffect(() => {
    setTodayDateLabel(
      new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long" }),
    );
  }, []);

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
              {hero.metricLabel} ·{" "}
              {onPeriodChange ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded uppercase tracking-wider underline-offset-4 outline-none transition-colors",
                      "hover:text-white hover:underline focus-visible:underline dark:hover:text-slate-900",
                    )}
                  >
                    {hero.periodLabel}
                    {isPeriodLoading ? (
                      <RefreshCw className="ml-0.5 size-2.5 animate-spin" aria-hidden />
                    ) : (
                      <ChevronDown className="size-3" aria-hidden />
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-36">
                    {HERO_PERIOD_OPTIONS.map((option) => (
                      <DropdownMenuItem
                        key={option.key}
                        onSelect={() => onPeriodChange(option.key)}
                        className="text-xs"
                      >
                        {option.label}
                        {option.key === periodKey ? (
                          <Check className="ml-auto size-3.5" aria-hidden />
                        ) : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                hero.periodLabel
              )}
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
            {deltaBadgeVisible && hero.deltaPercent !== null ? (
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

        <div
          ref={chartAreaRef}
          className="relative flex min-h-[121px] min-w-0 border-t border-white/10 dark:border-slate-900/10 md:col-span-3 md:h-full md:min-h-0 md:border-t-0"
        >
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
                <linearGradient id={FILL_FORECAST_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-forecast)"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-forecast)"
                    stopOpacity={0.03}
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
                  // Future days carry a null actual; show only the series
                  // that exist for the hovered day. Actual sales lead the
                  // projection, since that is the headline figure.
                  const presentSeries = tooltipProps.payload
                    ?.filter((entry) => typeof entry.value === "number")
                    .sort((a, b) =>
                      a.dataKey === "revenue"
                        ? -1
                        : b.dataKey === "revenue"
                          ? 1
                          : 0,
                    );
                  return (
                    <ChartTooltipContent
                      active={tooltipProps.active}
                      payload={presentSeries}
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
                      formatter={(value, name) => {
                        const isForecast = name === "forecast";
                        return (
                          <div className="flex flex-1 items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5">
                              <span
                                aria-hidden
                                className={cn(
                                  "size-2 shrink-0 rounded-[2px]",
                                  isForecast && "opacity-70 outline-dashed outline-1 outline-offset-1",
                                )}
                                style={{
                                  backgroundColor: isForecast
                                    ? "var(--color-forecast)"
                                    : "var(--color-revenue)",
                                }}
                              />
                              <span className="text-emerald-200/85 dark:text-slate-500">
                                {isForecast ? "Projected" : "Actual sales"}
                              </span>
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {typeof value === "number"
                                ? currency.format(value)
                                : value}
                            </span>
                          </div>
                        );
                      }}
                    />
                  );
                }}
              />
              {hasForecast ? (
                <ReferenceLine
                  x="Today"
                  stroke="rgb(148 163 184 / 0.55)"
                  strokeDasharray="2 4"
                  strokeWidth={1}
                />
              ) : null}
              {hasForecast ? (
                <Area
                  dataKey="forecast"
                  type="natural"
                  fill={`url(#${FILL_FORECAST_ID})`}
                  fillOpacity={0.4}
                  stroke="var(--color-forecast)"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  animationDuration={HERO_VALUE_ANIMATION_MS}
                  animationEasing="ease-out"
                />
              ) : null}
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
              {frontierPoint ? (
                <ReferenceDot
                  x={frontierPoint.label}
                  y={frontierPoint.revenue ?? 0}
                  isFront
                  shape={(props: { cx?: number; cy?: number }) =>
                    props.cx != null && props.cy != null ? (
                      <g>
                        {todayDateLabel ? (
                          <TodayLineBadge
                            cx={props.cx}
                            cy={props.cy}
                            chartWidth={chartWidth}
                            dateLabel={todayDateLabel}
                          />
                        ) : null}
                        <FrontierDot cx={props.cx} cy={props.cy} />
                      </g>
                    ) : (
                      <g />
                    )
                  }
                />
              ) : null}
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
