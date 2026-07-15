"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronsDown, ChevronsUp } from "lucide-react";
import { Cell, Pie, PieChart, Sector } from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";

import { Card, CardContent, CardDescription } from "@workspace/ui/components/card";
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
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { ScopedContext } from "@/entities/access/scoped-navigation-context";
import type { DashboardKpiData } from "@/entities/dashboard/model/dummy-dashboard-data";
import type {
  DashboardAvgCheckBreakdown,
  DashboardAvgCheckCategory,
} from "@/entities/dashboard/model/use-dashboard-avg-check-breakdown";

const PRIMARY = "var(--brand-supersolt-primary)";
/** Time each category stays highlighted before the spotlight moves on. */
const DWELL_MS = 4000;
/** Detail-panel cross-fade duration; matches the `duration-300` transition. */
const FADE_MS = 300;

/** Brand-primary mixed toward the surface: one shade per revenue rank. */
const SLICE_MIXES = [100, 76, 56, 42, 31, 22] as const;

function sliceColor(rank: number): string {
  const mix = SLICE_MIXES[Math.min(rank, SLICE_MIXES.length - 1)]!;
  return `color-mix(in oklab, ${PRIMARY} ${mix}%, var(--muted-foreground) ${100 - mix}%)`;
}

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

const chartConfig = {
  sharePct: { label: "Share of sales", color: PRIMARY },
} satisfies ChartConfig;

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/25 px-2 py-1.5">
      <p className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-sm font-semibold tabular-nums leading-tight">
        {value}
      </p>
    </div>
  );
}

function kpiDeltaTextClassName(direction: "up" | "down"): string {
  if (direction === "up") {
    return "text-emerald-900 dark:text-emerald-100";
  }
  return "text-rose-900 dark:text-rose-100";
}

function CategoryDonutChart({
  categories,
  activeIndex,
  onSelect,
  className,
}: {
  categories: DashboardAvgCheckCategory[];
  activeIndex: number;
  onSelect: (index: number) => void;
  className?: string;
}) {
  const active = categories[activeIndex];

  return (
    <div className={cn("relative h-36 w-36 shrink-0 md:h-40 md:w-40", className)}>
      <ChartContainer
        id="avg-check-donut"
        config={chartConfig}
        className="aspect-square h-full w-full [&_.recharts-responsive-container]:!h-full"
      >
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={categories}
            dataKey="revenueCents"
            nameKey="label"
            startAngle={90}
            endAngle={-270}
            innerRadius="58%"
            outerRadius="86%"
            strokeWidth={5}
            paddingAngle={2}
            animationDuration={900}
            animationEasing="ease-out"
            activeIndex={activeIndex}
            activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
              <Sector {...props} outerRadius={outerRadius + 7} />
            )}
            onClick={(_, index) => onSelect(index)}
            onMouseEnter={(_, index) => onSelect(index)}
          >
            {categories.map((entry, i) => (
              <Cell
                key={entry.key}
                fill={sliceColor(i)}
                fillOpacity={i === activeIndex ? 1 : 0.55}
                stroke="transparent"
                cursor="pointer"
                style={{ transition: "fill-opacity 300ms ease" }}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      {active ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        >
          <span className="text-lg font-semibold leading-none tracking-tight tabular-nums">
            {active.sharePct.toFixed(0)}%
          </span>
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            of sales
          </span>
        </div>
      ) : null}
    </div>
  );
}

function CategoryDetail({
  category,
  countUpDelaySeconds,
}: {
  category: DashboardAvgCheckCategory;
  countUpDelaySeconds: number;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <p
        className="truncate text-lg font-semibold leading-tight tracking-tight text-foreground"
        title={category.label}
      >
        {category.label}
      </p>

      <div className="flex items-baseline gap-1.5">
        <span
          className="text-3xl font-semibold leading-none tracking-tight tabular-nums"
          style={{ color: PRIMARY }}
        >
          <DashboardCountUp
            end={category.avgPerCheckCents / 100}
            decimals={2}
            duration={1.1}
            delay={countUpDelaySeconds}
            prefix="$"
            separator=""
          />
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          of each check
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 min-[480px]:grid-cols-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Share" value={`${category.sharePct.toFixed(1)}%`} />
        <MiniStat label="Revenue" value={money(category.revenueCents)} />
        <MiniStat
          label="Sold"
          value={category.quantity.toLocaleString("en-AU", {
            maximumFractionDigits: 0,
          })}
        />
        <MiniStat
          label="In orders"
          value={`${category.attachRatePct.toFixed(0)}%`}
        />
      </div>
    </div>
  );
}

type AvgCheckBreakdownCardProps = {
  /** Headline KPI (live avg check with delta) — same data the old card showed. */
  kpi: DashboardKpiData | undefined;
  data: DashboardAvgCheckBreakdown | null | undefined;
  isLoading: boolean;
  linkScope?: ScopedContext | null;
  /** Match the wrapping entrance delay so the first count runs while visible. */
  countUpDelaySeconds?: number;
  className?: string;
};

/**
 * Wide avg-check card: headline on the left, an auto-cycling category
 * spotlight in the middle, and a donut chart on the right whose popped-out
 * active sector tracks the spotlight (carousel-style). Pauses on hover;
 * dots and the sectors themselves jump to a category.
 */
export function AvgCheckBreakdownCard({
  kpi,
  data,
  isLoading,
  linkScope,
  countUpDelaySeconds = 0,
  className,
}: AvgCheckBreakdownCardProps) {
  const reduceMotion = usePrefersReducedMotion();
  const categories = React.useMemo(() => data?.categories ?? [], [data]);
  const count = categories.length;

  const [index, setIndex] = React.useState(0);
  const [visible, setVisible] = React.useState(true);
  const [paused, setPaused] = React.useState(false);
  const firstAppearanceRef = React.useRef(true);

  const safeIndex = count > 0 ? ((index % count) + count) % count : 0;

  // Entrance: mount each detail slide hidden, then reveal next frame so the
  // cross-fade plays whenever the active category changes.
  React.useLayoutEffect(() => {
    if (reduceMotion) {
      setVisible(true);
      return;
    }
    setVisible(false);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [safeIndex, reduceMotion]);

  // Auto-advance: dwell, fade the detail out, then move the highlight on.
  React.useEffect(() => {
    if (paused || count <= 1) return;

    if (reduceMotion) {
      const id = window.setInterval(() => {
        firstAppearanceRef.current = false;
        setIndex((i) => (i + 1) % count);
      }, DWELL_MS + FADE_MS);
      return () => window.clearInterval(id);
    }

    let advanceId = 0;
    const dwellId = window.setTimeout(() => {
      setVisible(false);
      advanceId = window.setTimeout(() => {
        firstAppearanceRef.current = false;
        setIndex((i) => (i + 1) % count);
      }, FADE_MS);
    }, DWELL_MS);

    return () => {
      window.clearTimeout(dwellId);
      window.clearTimeout(advanceId);
    };
  }, [safeIndex, paused, count, reduceMotion]);

  const jumpTo = React.useCallback((next: number) => {
    firstAppearanceRef.current = false;
    setIndex(next);
  }, []);

  const active = categories[safeIndex];
  const countDelay = firstAppearanceRef.current ? countUpDelaySeconds : 0.12;

  const headlineEnd = kpi ? kpi.countUpEnd : (data?.avgCheckCents ?? 0) / 100;
  const salesHref =
    linkScope != null
      ? `/${linkScope.organisationSlug}/${linkScope.venueSlug}/insights/sales`
      : null;

  const headline = (
    <>
      <CardDescription className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground leading-none">
        Avg sale - last 7d
        {salesHref ? (
          <ArrowUpRight
            className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden
          />
        ) : null}
      </CardDescription>
      <div className="flex min-w-0 flex-wrap items-start gap-2">
        <span className="text-4xl font-semibold leading-none tracking-tight">
          <DashboardCountUp
            end={headlineEnd}
            decimals={kpi?.countUpDecimals ?? 2}
            duration={1.1}
            delay={countUpDelaySeconds}
            prefix={kpi?.countUpPrefix ?? "$"}
            suffix={kpi?.countUpSuffix}
            separator=""
          />
        </span>
        {kpi ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex h-fit shrink-0 cursor-help items-center gap-0 text-xs font-medium [&>svg]:size-3.5",
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
    </>
  );

  return (
    <Card className={cn("h-full min-h-0 gap-0 overflow-hidden py-0", className)}>
      <CardContent
        className="flex h-full min-h-0 flex-col gap-3 p-0 px-6 py-4"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          {salesHref ? (
            <Link
              href={salesHref}
              className="group flex min-w-0 flex-col gap-2 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {headline}
            </Link>
          ) : (
            <div className="flex min-w-0 flex-col gap-2">{headline}</div>
          )}

          {count > 1 ? (
            <div
              className="flex items-center gap-1.5 pt-0.5"
              role="tablist"
              aria-label="Avg sale categories"
            >
              {categories.map((category, i) => {
                const selected = i === safeIndex;
                return (
                  <button
                    key={category.key}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-label={`Show ${category.label}`}
                    onClick={() => jumpTo(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      selected ? "w-4" : "w-1.5 bg-muted-foreground/30",
                    )}
                    style={selected ? { backgroundColor: PRIMARY } : undefined}
                  />
                );
              })}
            </div>
          ) : null}
        </div>

        {isLoading && !data ? (
          <div className="min-h-28 flex-1 animate-pulse rounded-xl bg-muted/40" />
        ) : count === 0 || !active ? (
          <div className="flex min-h-28 flex-1 items-center justify-center rounded-xl border border-dashed border-border/70 px-4 text-center text-sm text-muted-foreground">
            No item-level sales this week yet.
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
            <div
              key={safeIndex}
              className={cn(
                "min-w-0 flex-1",
                !reduceMotion && "transition-all duration-300 ease-out",
                visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-1.5",
              )}
            >
              <CategoryDetail
                category={active}
                countUpDelaySeconds={countDelay}
              />
            </div>

            <CategoryDonutChart
              categories={categories}
              activeIndex={safeIndex}
              onSelect={jumpTo}
              className="sm:-mt-10 sm:self-start"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
