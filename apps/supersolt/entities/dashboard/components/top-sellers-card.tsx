"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import CountUp from "react-countup";
import { Bar, BarChart } from "recharts";

import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  ChartContainer,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { cn } from "@workspace/ui/lib/utils";
import { SquareWordmark } from "@/components/branding/square-wordmark";
import {
  DashboardCountUp,
  easeOutExpo,
} from "@/entities/dashboard/components/dashboard-count-up";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { ScopedContext } from "@/entities/access/scoped-navigation-context";
import type {
  DashboardTopSeller,
  DashboardTopSellingItems,
} from "@/entities/dashboard/model/use-dashboard-top-items";

const PRIMARY = "var(--brand-supersolt-primary)";
/** Time each product stays fully shown before it starts leaving. */
const DWELL_MS = 4500;
/** Per-element entrance stagger step within a slide. */
const IN_STAGGER_MS = 80;
/** Per-element exit stagger step; tighter so the hand-off stays snappy. */
const OUT_STAGGER_MS = 50;
/** Matches `animate-slide-up-fade-out-slow` (0.42s). */
const OUT_MS = 420;
/** Highest `order` used by a slide's elements (rank row → chart). */
const MAX_ORDER = 5;
/** Full exit choreography: last element's delay plus its animation. */
const OUT_TOTAL_MS = OUT_MS + MAX_ORDER * OUT_STAGGER_MS;

type SlidePhase = "in" | "out";

/**
 * One staggered element of the spotlight: slides up + fades in on entrance,
 * slides up + fades out on exit, offset by `order` so elements arrive and
 * leave one at a time.
 */
function SlideBit({
  phase,
  order,
  animate,
  entranceOffsetMs = 0,
  className,
  children,
}: {
  phase: SlidePhase;
  order: number;
  animate: boolean;
  /** Extra entrance delay (ms) so the first slide syncs with the card reveal. */
  entranceOffsetMs?: number;
  className?: string;
  children: React.ReactNode;
}) {
  if (!animate) {
    return <div className={className}>{children}</div>;
  }
  const leaving = phase === "out";
  const delayMs = leaving
    ? order * OUT_STAGGER_MS
    : entranceOffsetMs + order * IN_STAGGER_MS;
  return (
    <div
      className={cn(
        leaving
          ? "animate-slide-up-fade-out-slow"
          : "animate-slide-up-fade-in-slow",
        className,
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}

const chartConfig = {
  quantity: { label: "Sold", color: PRIMARY },
} satisfies ChartConfig;

function SoldPerDayChart({ daily }: { daily: DashboardTopSeller["daily"] }) {
  return (
    <ChartContainer
      config={chartConfig}
      // Absolutely fill the slot: the slot's height comes from min-height +
      // flex, which `h-full` percentages resolve to 0 against, leaving
      // ResponsiveContainer measuring 0 and drawing nothing.
      className="absolute inset-0 aspect-auto h-full w-full [&_.recharts-responsive-container]:!h-full"
    >
      <BarChart data={daily} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
        <Bar
          dataKey="quantity"
          fill="var(--color-quantity)"
          fillOpacity={0.85}
          radius={[2, 2, 0, 0]}
          animationDuration={650}
        />
      </BarChart>
    </ChartContainer>
  );
}

function MiniStat({
  label,
  end,
  decimals = 0,
  prefix,
  suffix,
  countDelaySeconds,
}: {
  label: string;
  end: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  countDelaySeconds: number;
}) {
  return (
    <div className="h-full min-w-0 rounded-lg border bg-muted/25 px-2 py-1.5">
      <p className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-sm font-semibold tabular-nums leading-tight">
        <CountUp
          start={0}
          end={end}
          decimals={decimals}
          duration={0.9}
          delay={countDelaySeconds}
          prefix={prefix}
          suffix={suffix}
          separator=","
          preserveValue
          useEasing
          easingFn={easeOutExpo}
        />
      </p>
    </div>
  );
}

function Spotlight({
  item,
  rank,
  phase,
  animate,
  entranceOffsetMs,
  countUpDelaySeconds,
}: {
  item: DashboardTopSeller;
  rank: number;
  phase: SlidePhase;
  animate: boolean;
  entranceOffsetMs: number;
  countUpDelaySeconds: number;
}) {
  const qtyDecimals = Number.isInteger(item.quantity) ? 0 : 1;
  const showChart = item.daily.length >= 2;
  // Each numeric run-up starts as its element lands.
  const countDelayFor = (order: number) =>
    countUpDelaySeconds + (animate ? (order * IN_STAGGER_MS) / 1000 : 0);
  const bit = { phase, animate, entranceOffsetMs };

  // Mount the chart only once its slot has staggered in so the bar draw-in
  // plays in view (recharts' own `animationBegin` can strand bars at zero
  // height when ResponsiveContainer re-measures mid-delay).
  const [chartLive, setChartLive] = React.useState(!animate);
  React.useEffect(() => {
    if (!animate) return;
    const id = window.setTimeout(
      () => setChartLive(true),
      entranceOffsetMs + 5 * IN_STAGGER_MS,
    );
    return () => window.clearTimeout(id);
  }, [animate, entranceOffsetMs]);
  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      <SlideBit {...bit} order={0} className="flex items-center gap-2">
        <span
          className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold"
          style={{
            color: PRIMARY,
            backgroundColor: `color-mix(in oklab, ${PRIMARY} 16%, transparent)`,
          }}
        >
          #{rank}
        </span>
        <p
          className="min-w-0 truncate text-lg font-semibold leading-tight tracking-tight text-foreground"
          title={item.label}
        >
          {item.label}
        </p>
        {!item.mapped ? (
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            unmapped
          </span>
        ) : null}
      </SlideBit>

      <SlideBit
        {...bit}
        order={1}
        className="flex items-end justify-between gap-2"
      >
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-3xl font-semibold leading-none tracking-tight tabular-nums"
            style={{ color: PRIMARY }}
          >
            <DashboardCountUp
              end={item.quantity}
              decimals={qtyDecimals}
              duration={1.1}
              delay={countDelayFor(1)}
              separator=""
            />
          </span>
          <span className="text-xs font-medium text-muted-foreground">sold</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold leading-none tabular-nums">
            <CountUp
              start={0}
              end={item.avgUnitPriceCents / 100}
              decimals={2}
              duration={0.9}
              delay={countDelayFor(1)}
              prefix="$"
              separator=","
              preserveValue
              useEasing
              easingFn={easeOutExpo}
            />
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            avg price
          </p>
        </div>
      </SlideBit>

      <div className="grid grid-cols-3 gap-1.5">
        <SlideBit {...bit} order={2} className="min-w-0">
          <MiniStat
            label="Revenue"
            end={item.revenueCents / 100}
            prefix="$"
            countDelaySeconds={countDelayFor(2)}
          />
        </SlideBit>
        <SlideBit {...bit} order={3} className="min-w-0">
          <MiniStat
            label="Share"
            end={item.revenueSharePct}
            decimals={1}
            suffix="%"
            countDelaySeconds={countDelayFor(3)}
          />
        </SlideBit>
        <SlideBit {...bit} order={4} className="min-w-0">
          <MiniStat
            label="In orders"
            end={item.attachRatePercent}
            suffix="%"
            countDelaySeconds={countDelayFor(4)}
          />
        </SlideBit>
      </div>

      {showChart ? (
        <SlideBit
          {...bit}
          order={5}
          className="flex min-h-0 flex-1 flex-col gap-1"
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Sold per day
          </p>
          <div className="relative min-h-16 flex-1">
            {chartLive ? <SoldPerDayChart daily={item.daily} /> : null}
          </div>
        </SlideBit>
      ) : (
        <div className="min-h-0 flex-1" />
      )}

    </div>
  );
}

type TopSellersCardProps = {
  data: DashboardTopSellingItems | null | undefined;
  isLoading: boolean;
  linkScope?: ScopedContext | null;
  /** Match the wrapping entrance delay so the first count runs while visible. */
  countUpDelaySeconds?: number;
  className?: string;
};

/**
 * Auto-cycling "top sellers" spotlight: each slide's elements stagger in one
 * at a time (slide-up-fade-in), dwell ~5s, then stagger out (slide-up-fade-out)
 * before the next product lands. Pauses on hover; the position dots let you
 * jump.
 */
export function TopSellersCard({
  data,
  isLoading,
  linkScope,
  countUpDelaySeconds = 0,
  className,
}: TopSellersCardProps) {
  const reduceMotion = usePrefersReducedMotion();
  const items = data?.items ?? [];
  const count = items.length;

  const [index, setIndex] = React.useState(0);
  const [phase, setPhase] = React.useState<SlidePhase>("in");
  const [paused, setPaused] = React.useState(false);
  // First appearance offsets the choreography by the card's entrance delay so
  // it plays as the card reveals; later cycles start promptly.
  const firstAppearanceRef = React.useRef(true);

  const safeIndex = count > 0 ? ((index % count) + count) % count : 0;

  // Dwell, then kick off the staggered exit (or swap directly under reduced
  // motion). Hover pauses here, never mid-exit, so the card can't freeze blank.
  React.useEffect(() => {
    if (paused || count <= 1 || phase !== "in") return;
    const id = window.setTimeout(() => {
      firstAppearanceRef.current = false;
      if (reduceMotion) {
        setIndex((i) => (i + 1) % count);
      } else {
        setPhase("out");
      }
    }, DWELL_MS);
    return () => window.clearTimeout(id);
  }, [safeIndex, phase, paused, count, reduceMotion]);

  // Once every element has staggered out, swap to the next product; the key
  // change remounts the slide and its entrance choreography replays.
  React.useEffect(() => {
    if (phase !== "out" || count === 0) return;
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % count);
      setPhase("in");
    }, OUT_TOTAL_MS);
    return () => window.clearTimeout(id);
  }, [phase, count]);

  const jumpTo = React.useCallback((next: number) => {
    firstAppearanceRef.current = false;
    setIndex(next);
    setPhase("in");
  }, []);

  const isDemo = data?.dataSource === "demo";
  const windowDays = data?.windowDays ?? 7;
  const moreCount = Math.max(0, (data?.totalMixItems ?? 0) - count);
  const salesHref =
    linkScope != null
      ? `/${linkScope.organisationSlug}/${linkScope.venueSlug}/insights/sales`
      : null;

  const sourceBadge = data ? (
    isDemo ? (
      <Badge
        variant="outline"
        className="h-5 px-1.5 text-[10px] font-normal text-muted-foreground"
      >
        Demo
      </Badge>
    ) : (
      <Badge
        variant="secondary"
        className="h-5 gap-1 px-1.5 py-0 text-[10px] font-normal"
      >
        <SquareWordmark tone="auto" className="h-2.5" decorative />
      </Badge>
    )
  ) : null;

  const active = items[safeIndex];
  const countDelay = firstAppearanceRef.current ? countUpDelaySeconds : 0.12;
  const entranceOffsetMs = firstAppearanceRef.current
    ? countUpDelaySeconds * 1000
    : 0;

  return (
    <Card className={cn("h-full min-h-0 gap-0 overflow-hidden py-0", className)}>
      <CardContent className="flex h-full min-h-0 flex-col gap-3 p-0 px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp
                className="size-3.5 shrink-0"
                style={{ color: PRIMARY }}
                aria-hidden
              />
              <span className="text-sm font-semibold leading-none tracking-tight">
                Top sellers
              </span>
            </div>
            <span className="text-xs leading-none text-muted-foreground">
              Sales mix · last {windowDays} days
            </span>
          </div>
          {sourceBadge}
        </div>

        {isLoading && !data ? (
          <div className="min-h-0 flex-1 animate-pulse rounded-xl bg-muted/40" />
        ) : count === 0 || !active ? (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-border/70 px-4 text-center text-sm text-muted-foreground">
            No item-level sales in the last {windowDays} days yet.
          </div>
        ) : (
          <>
            <div
              className="relative min-h-0 flex-1"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <div key={safeIndex} className="h-full min-h-0">
                <Spotlight
                  item={active}
                  rank={safeIndex + 1}
                  phase={phase}
                  animate={!reduceMotion}
                  entranceOffsetMs={entranceOffsetMs}
                  countUpDelaySeconds={countDelay}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div
                className="flex items-center gap-1.5"
                role="tablist"
                aria-label="Top sellers"
              >
                {items.map((item, i) => {
                  const selected = i === safeIndex;
                  return (
                    <button
                      key={`${item.label}-${i}`}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-label={`Show ${item.label}`}
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

              {salesHref ? (
                <Link
                  href={salesHref}
                  className="inline-flex shrink-0 items-center gap-0.5 rounded text-[11px] font-medium text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:underline"
                >
                  {moreCount > 0 ? `+${moreCount} more` : "Full mix"}
                  <ArrowUpRight className="size-3" aria-hidden />
                </Link>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
