"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  RadialBar,
  RadialBarChart,
  Rectangle,
  XAxis,
  YAxis,
} from "recharts";
import { BedDouble, Loader2 } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { useSleepNights, type SleepNight } from "@/hooks/health/use-health";

const WINDOWS = [
  { value: "day", label: "Day", days: 1 },
  { value: "week", label: "Week", days: 7 },
  { value: "month", label: "Month", days: 30 },
  { value: "3m", label: "3M", days: 90 },
  { value: "6m", label: "6M", days: 180 },
  { value: "year", label: "Year", days: 365 },
] as const;

type WindowValue = (typeof WINDOWS)[number]["value"];

/** Anchor the schedule axis at 6pm so an evening→morning night is a single
 *  ascending span and never wraps across the midnight boundary. */
const SCHEDULE_ANCHOR_MIN = 18 * 60;

/** Clock time -> minutes since 6pm (0–1439). */
function scheduleOffset(iso: string | null): number | null {
  if (!iso) return null;
  let d: Date;
  try {
    d = parseISO(iso);
  } catch {
    return null;
  }
  if (Number.isNaN(d.getTime())) return null;
  const mins = d.getHours() * 60 + d.getMinutes();
  return (mins - SCHEDULE_ANCHOR_MIN + 1440) % 1440;
}

/** Minutes-since-6pm offset -> "11:07 PM". */
function offsetToClock(offset: number): string {
  return formatClockMinutes((offset + SCHEDULE_ANCHOR_MIN) % 1440);
}

function shortDate(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM");
  } catch {
    return iso;
  }
}

/** Hours (e.g. 7.07) -> "7h 4m". */
function formatHours(hours: number | null | undefined): string {
  if (hours == null) return "–";
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function clockTime(iso: string | null): string {
  if (!iso) return "–";
  try {
    return format(parseISO(iso), "h:mm a");
  } catch {
    return "–";
  }
}

/** Circular mean of clock times, in minutes-of-day (0–1439), or null.
 *  Uses vector averaging so times either side of midnight (11pm / 1am)
 *  average correctly instead of collapsing toward noon. */
function averageClockMinutes(isos: (string | null)[]): number | null {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const iso of isos) {
    if (!iso) continue;
    let d: Date;
    try {
      d = parseISO(iso);
    } catch {
      continue;
    }
    if (Number.isNaN(d.getTime())) continue;
    const mins = d.getHours() * 60 + d.getMinutes();
    const angle = (mins / 1440) * 2 * Math.PI;
    x += Math.cos(angle);
    y += Math.sin(angle);
    n += 1;
  }
  if (n === 0) return null;
  let angle = Math.atan2(y / n, x / n);
  if (angle < 0) angle += 2 * Math.PI;
  return Math.round((angle / (2 * Math.PI)) * 1440) % 1440;
}

/** Minutes-of-day (0–1439) -> "11:07 PM". */
function formatClockMinutes(mins: number | null): string {
  if (mins == null) return "–";
  const rounded = Math.round(mins);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Clock time -> minutes-of-day (0–1439), or null. */
function isoToMinutes(iso: string | null): number | null {
  if (!iso) return null;
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.getHours() * 60 + d.getMinutes();
  } catch {
    return null;
  }
}

/** How long the header value count-ups run (ms). */
const COUNTUP_MS = 1100;

/** Drives a value from 0 → target with an ease-out curve. Re-runs on change. */
function useCountUp(target: number, duration = COUNTUP_MS): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

/** Count-up wrapper: animates `value` from 0 and renders it through `format`.
 *  A null value short-circuits to the formatter's empty state (e.g. "–"). */
function CountUp({
  value,
  format: fmt,
  duration,
}: {
  value: number | null;
  format: (n: number) => string;
  duration?: number;
}) {
  const animated = useCountUp(value ?? 0, duration);
  return <>{value == null ? "–" : fmt(animated)}</>;
}

/** The stages that "bloom in" during the colour pass; core is the green base. */
const REVEAL_KEYS = ["deep", "rem", "awake"] as const;

// Reveal timeline. Phase A fades every bar in (green) left→right; only once it
// finishes does Phase B bloom the stage colours in at sporadic times.
const PHASE_A_MS = 1800; // total green sweep
const BAR_FADE_MS = 800; // how long each individual bar takes to fade in green
const PHASE_B_MS = 1400; // colour-calc window
const REVEAL_MS = 300; // how long one stage takes to bloom in
const TOTAL_MS = PHASE_A_MS + PHASE_B_MS;
// Bring the header cards in halfway through the colour-calc pass.
const CARDS_REVEAL_MS = PHASE_A_MS + PHASE_B_MS / 2;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

type RevealEvent = { key: (typeof REVEAL_KEYS)[number]; start: number };

/** Per-bar shape that fades the column in via its datum's `op` value (driven by
 *  the animation clock each frame), instead of popping in at full opacity. */
function FadeBar(props: unknown) {
  const { op, ...rest } = props as { op?: number; [key: string]: unknown };
  return (
    <g opacity={op ?? 1}>
      <Rectangle {...rest} />
    </g>
  );
}

const config = {
  deep: { label: "Deep", color: "var(--chart-1)" },
  core: { label: "Core", color: "var(--chart-2)" },
  rem: { label: "REM", color: "var(--chart-3)" },
  awake: { label: "Awake", color: "var(--chart-4)" },
} satisfies ChartConfig;

type ScheduleDatum = {
  date: string;
  /** No (or negligible) sleep recorded; renders as an empty column. */
  empty: boolean;
  /** Transparent offset (minutes since 6pm) up to bedtime, floats the stack. */
  base: number;
  /** Width of the bed→wake window in minutes; the stages are scaled to fill it. */
  span: number;
  /** Current fade-in opacity for the Phase-A green sweep (0–1). */
  op?: number;
  /** Stage spans scaled to fill the bed→wake window, in minutes. */
  deep: number;
  core: number;
  rem: number;
  awake: number;
  bed: string | null;
  wake: string | null;
  /** Raw stage durations (hours) for the tooltip. */
  deepH: number | null;
  coreH: number | null;
  remH: number | null;
  awakeH: number | null;
};

function ScheduleTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ScheduleDatum }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]!.payload;
  if (d.empty) {
    return (
      <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
        <p className="font-medium">{shortDate(d.date)}</p>
        <p className="text-muted-foreground">No sleep recorded</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{shortDate(d.date)}</p>
      <p className="text-muted-foreground">
        {clockTime(d.bed)} → {clockTime(d.wake)}
      </p>
      <div className="mt-1.5 w-32 space-y-1">
        <StageRow label="Deep" hours={d.deepH} color="var(--chart-1)" />
        <StageRow label="Core" hours={d.coreH} color="var(--chart-2)" />
        <StageRow label="REM" hours={d.remH} color="var(--chart-3)" />
        <StageRow label="Awake" hours={d.awakeH} color="var(--chart-4)" />
      </div>
    </div>
  );
}

function StageRow({
  label,
  hours,
  color,
}: {
  label: string;
  hours: number | null;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="ml-auto text-xs font-medium tabular-nums">
        {formatHours(hours)}
      </span>
    </div>
  );
}

function StageBadge({
  label,
  hours,
  color,
  delayMs = 0,
}: {
  label: string;
  hours: number | null;
  color: string;
  delayMs?: number;
}) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1.5"
      style={{ animation: `riseIn 450ms ease-out ${delayMs}ms both` }}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-[2px]"
        style={{ backgroundColor: color }}
      />
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="ml-auto text-xs font-semibold tabular-nums">
        <CountUp value={hours} format={formatHours} />
      </span>
    </div>
  );
}

function longDate(iso: string): string {
  try {
    return format(parseISO(iso), "EEE, d MMM");
  } catch {
    return iso;
  }
}

function LatestNight({ night }: { night: SleepNight }) {
  // Each stage as a concentric ring (minutes), matching the badge colours.
  const radialData = [
    { stage: "awake", value: (night.awake ?? 0) * 60, fill: "var(--color-awake)" },
    { stage: "rem", value: (night.rem ?? 0) * 60, fill: "var(--color-rem)" },
    { stage: "core", value: (night.core ?? 0) * 60, fill: "var(--color-core)" },
    { stage: "deep", value: (night.deep ?? 0) * 60, fill: "var(--color-deep)" },
  ].filter((d) => d.value > 0);

  return (
    <Card
      className="py-0"
      style={{ animation: "cardInLeft 600ms ease-out both" }}
    >
      <CardContent className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1 space-y-3">
          <div
            className="flex items-baseline justify-between gap-2"
            style={{ animation: "riseIn 450ms ease-out 150ms both" }}
          >
            <div>
              <p className="text-sm text-muted-foreground">
                {longDate(night.date)}
              </p>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                <CountUp value={night.totalSleep} format={formatHours} />
              </p>
            </div>
            <p className="text-right text-xs text-muted-foreground tabular-nums">
              <CountUp
                value={isoToMinutes(night.sleepStart)}
                format={formatClockMinutes}
              />{" "}
              –{" "}
              <CountUp
                value={isoToMinutes(night.sleepEnd)}
                format={formatClockMinutes}
              />
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StageBadge
              label="Deep"
              hours={night.deep}
              color="var(--chart-1)"
              delayMs={250}
            />
            <StageBadge
              label="Core"
              hours={night.core}
              color="var(--chart-2)"
              delayMs={320}
            />
            <StageBadge
              label="REM"
              hours={night.rem}
              color="var(--chart-3)"
              delayMs={390}
            />
            <StageBadge
              label="Awake"
              hours={night.awake}
              color="var(--chart-4)"
              delayMs={460}
            />
          </div>
        </div>
        {radialData.length > 0 ? (
          <ChartContainer
            config={config}
            className="aspect-square w-28 shrink-0"
            style={{ animation: "riseIn 500ms ease-out 300ms both" }}
          >
            <RadialBarChart
              data={radialData}
              startAngle={-90}
              endAngle={270}
              innerRadius={20}
              outerRadius={54}
            >
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    nameKey="stage"
                    formatter={(value, _name, item) => {
                      const stage = String(item?.payload?.stage ?? "");
                      const label =
                        config[stage as keyof typeof config]?.label ?? stage;
                      return (
                        <div className="flex w-full items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                            style={{ backgroundColor: item?.payload?.fill }}
                          />
                          <span className="text-muted-foreground">{label}</span>
                          <span className="ml-auto font-medium tabular-nums">
                            {formatHours(Number(value) / 60)}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <RadialBar dataKey="value" background cornerRadius={3} />
            </RadialBarChart>
          </ChartContainer>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Roughly how long the simulated retrieval takes before the screen exits. */
const LOADER_DURATION_MS = 5000;
/** Length of the slide-down/fade-out once the bar fills. */
const LOADER_EXIT_MS = 550;

/** Intro screen: the bed slides down and fades in, then the Zs start drifting,
 *  then the label + progress bar fade up. The bar fills over ~5s in random
 *  bits and bursts, then the whole thing slides down and fades out. */
function SleepLoader({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    let exitId: ReturnType<typeof setTimeout>;
    const start = performance.now();
    let current = 0;

    const step = () => {
      if (cancelled) return;
      const elapsed = performance.now() - start;
      // Pace loosely against wall-clock so we land near 100% at ~5s, but let
      // each tick lunge ahead by a random burst for an organic, jumpy fill.
      const timeTarget = Math.min(100, (elapsed / LOADER_DURATION_MS) * 100);
      const burst = Math.random() * 14;
      current = Math.min(
        100,
        Math.max(current + burst, timeTarget * (0.55 + Math.random() * 0.45))
      );
      setProgress(current);

      if (current >= 100 || elapsed >= LOADER_DURATION_MS) {
        setProgress(100);
        setExiting(true);
        exitId = setTimeout(() => {
          if (!cancelled) onDone();
        }, LOADER_EXIT_MS);
        return;
      }
      // Irregular gaps between ticks -> "bits and bursts".
      timeoutId = setTimeout(step, 120 + Math.random() * 360);
    };

    timeoutId = setTimeout(step, 80); // start filling straight away
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      clearTimeout(exitId);
    };
  }, [onDone]);

  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-8"
      style={
        exiting
          ? { animation: `loaderOut ${LOADER_EXIT_MS}ms ease-in forwards` }
          : undefined
      }
    >
      <style>{`
        @keyframes zFloat {
          0% { opacity: 0; transform: translate(0, 0) scale(0.6); }
          25% { opacity: 1; }
          100% { opacity: 0; transform: translate(20px, -46px) scale(1.1); }
        }
        @keyframes bedIn {
          from { opacity: 0; transform: translateY(-22px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes loaderOut {
          from { opacity: 1; transform: none; }
          to { opacity: 0; transform: translateY(48px); }
        }
      `}</style>

      <div className="relative" style={{ animation: "bedIn 600ms ease-out both" }}>
        <BedDouble
          className="h-24 w-24 text-muted-foreground"
          strokeWidth={1.5}
        />
        {/* Zs sit over the bed's top-right corner; they hold off until the bed
            has landed, then loop. */}
        <div className="absolute right-3 top-2">
          <span
            className="absolute text-lg font-semibold text-primary"
            style={{ animation: "zFloat 2.4s ease-out 0.6s infinite" }}
          >
            z
          </span>
          <span
            className="absolute text-xl font-semibold text-primary"
            style={{ animation: "zFloat 2.4s ease-out 1.2s infinite" }}
          >
            z
          </span>
          <span
            className="absolute text-2xl font-semibold text-primary"
            style={{ animation: "zFloat 2.4s ease-out 1.8s infinite" }}
          >
            z
          </span>
        </div>
      </div>

      <div
        className="flex flex-col items-center gap-3"
        style={{ animation: "fadeUp 400ms ease-out both" }}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Retrieving sleep data</span>
        </div>
        <div className="h-1.5 w-56 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function HealthSleepPage() {
  const { data, isFetching } = useSleepNights();
  const [loaderDone, setLoaderDone] = useState(false);
  const allNights = useMemo(() => data ?? [], [data]);
  const [windowValue, setWindowValue] = useState<WindowValue>("month");

  const windowDays =
    WINDOWS.find((w) => w.value === windowValue)?.days ?? 30;

  // Filter relative to the most recent night so historical imports always
  // surface data for short windows instead of showing an empty range.
  const nights = useMemo(() => {
    if (allNights.length === 0) return [];
    const reference = parseISO(allNights[allNights.length - 1]!.date);
    return allNights.filter(
      (n) => differenceInCalendarDays(reference, parseISO(n.date)) < windowDays
    );
  }, [allNights, windowDays]);

  const scheduleData = useMemo<ScheduleDatum[]>(
    () =>
      nights.map((n): ScheduleDatum => {
        const empty: ScheduleDatum = {
          date: n.date,
          empty: true,
          base: 0,
          span: 0,
          deep: 0,
          core: 0,
          rem: 0,
          awake: 0,
          bed: null,
          wake: null,
          deepH: null,
          coreH: null,
          remH: null,
          awakeH: null,
        };

        const bed = scheduleOffset(n.sleepStart);
        const wake = scheduleOffset(n.sleepEnd);
        if (bed == null || wake == null) return empty;
        // With the 6pm anchor a real night is always an ascending
        // evening→morning span; a non-positive span is a garbage entry
        // (e.g. an afternoon "night") that would otherwise render across
        // the whole axis, so fall back to an empty column.
        const span = wake - bed;
        if (span <= 0) return empty;

        // Show days with no real sleep as an empty column so a missed night
        // is visible rather than silently dropped. "Sleep" excludes the awake
        // portion; under 15 minutes counts as no sleep.
        const asleepMin =
          ((n.deep ?? 0) + (n.core ?? 0) + (n.rem ?? 0)) * 60;
        if (asleepMin < 15) return empty;

        // Scale the stage durations so they exactly fill the bed→wake
        // window; we only have per-stage totals, not their ordering,
        // so they render as proportional bands inside the floating bar.
        const deepM = (n.deep ?? 0) * 60;
        const coreM = (n.core ?? 0) * 60;
        const remM = (n.rem ?? 0) * 60;
        const awakeM = (n.awake ?? 0) * 60;
        const sum = deepM + coreM + remM + awakeM;
        const scale = sum > 0 ? span / sum : 0;
        return {
          date: n.date,
          empty: false,
          base: bed,
          span,
          deep: deepM * scale,
          core: coreM * scale,
          rem: remM * scale,
          awake: awakeM * scale,
          bed: n.sleepStart,
          wake: n.sleepEnd,
          deepH: n.deep,
          coreH: n.core,
          remH: n.rem,
          awakeH: n.awake,
        };
      }),
    [nights]
  );

  // Zoom the axis to the actual bed/wake range; the transparent base would
  // otherwise pull the domain all the way down to the 6pm anchor.
  const scheduleDomain = useMemo<[number, number]>(() => {
    if (scheduleData.length === 0) return [0, 1440];
    let min = Infinity;
    let max = -Infinity;
    for (const d of scheduleData) {
      if (d.empty) continue;
      if (d.base < min) min = d.base;
      const top = d.base + d.deep + d.core + d.rem + d.awake;
      if (top > max) max = top;
    }
    if (min === Infinity) return [0, 1440];
    return [Math.max(0, min - 30), Math.min(1440, max + 30)];
  }, [scheduleData]);

  // Whole-hour gridlines (the 6pm anchor is itself a whole hour, so any
  // multiple of 60 lands on the hour). Widen the spacing as the range grows
  // so the labels stay readable.
  const scheduleTicks = useMemo<number[]>(() => {
    const [lo, hi] = scheduleDomain;
    const range = hi - lo;
    const stepHours = [1, 2, 3, 4, 6].find((h) => range / (h * 60) <= 8) ?? 6;
    const step = stepHours * 60;
    const ticks: number[] = [];
    for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);
    return ticks;
  }, [scheduleDomain]);

  const avgSleep = useMemo(() => {
    const totals = nights
      .map((n) => n.totalSleep)
      .filter((t): t is number => t != null);
    if (totals.length === 0) return null;
    return totals.reduce((a, b) => a + b, 0) / totals.length;
  }, [nights]);

  const avgBedtime = useMemo(
    () => averageClockMinutes(nights.map((n) => n.sleepStart)),
    [nights]
  );

  const avgWake = useMemo(
    () => averageClockMinutes(nights.map((n) => n.sleepEnd)),
    [nights]
  );

  // Two-phase reveal driven by a single time-based clock (smooth, not snapping).
  // Phase A: every bar grows in green, left→right, finishing before Phase B.
  // Phase B: deep/REM/awake bloom in at randomised times; the segments are
  // continuously renormalised to fill the window so the percentages readjust
  // smoothly as each colour "calculates" in.
  const revealRef = useRef<Record<number, RevealEvent[]>>({});
  const [clock, setClock] = useState(0);
  // Cards hold back until the graph finishes its sweep, then slide in. Sticky
  // once shown so toggling the window doesn't re-hide them.
  const [cardsReady, setCardsReady] = useState(false);

  useEffect(() => {
    // Don't burn the clock down while data is still loading, otherwise the
    // animation can finish before the chart is even mounted/visible. Likewise
    // hold until the intro loader has exited, since this effect runs via hooks
    // even while the loader is the only thing rendered; otherwise the reveal
    // plays behind the loader and everything is already shown when it lifts.
    if (scheduleData.length === 0 || !loaderDone) return;

    // Randomise each stage's bloom start within Phase B (sporadic ordering).
    const byBar: Record<number, RevealEvent[]> = {};
    scheduleData.forEach((d, i) => {
      if (d.empty) return;
      const finals = { deep: d.deep, rem: d.rem, awake: d.awake };
      for (const key of REVEAL_KEYS) {
        if (finals[key] <= 0) continue;
        const start =
          PHASE_A_MS + Math.random() * Math.max(1, PHASE_B_MS - REVEAL_MS);
        (byBar[i] ??= []).push({ key, start });
      }
    });
    revealRef.current = byBar;

    let raf = 0;
    let startT = 0;
    const tick = (now: number) => {
      if (!startT) startT = now;
      const elapsed = now - startT;
      setClock(Math.min(elapsed, TOTAL_MS));
      if (elapsed >= CARDS_REVEAL_MS) setCardsReady(true);
      if (elapsed < TOTAL_MS) raf = requestAnimationFrame(tick);
    };
    setClock(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scheduleData, loaderDone]);

  const displayData = useMemo<ScheduleDatum[]>(() => {
    const n = scheduleData.length;
    return scheduleData.map((d, i) => {
      if (d.empty) return d;

      // Phase A: bar fades in at full height (green), staggered left→right.
      const fadeStart = n > 1 ? (i / (n - 1)) * (PHASE_A_MS - BAR_FADE_MS) : 0;
      const op = easeInOut(clamp01((clock - fadeStart) / BAR_FADE_MS));

      // Phase B: each revealed stage eases 0→1 over its window; core is the
      // green base (weight held at its final value the whole time).
      let wDeep = 0;
      let wRem = 0;
      let wAwake = 0;
      for (const e of revealRef.current[i] ?? []) {
        const p = easeInOut(clamp01((clock - e.start) / REVEAL_MS));
        if (e.key === "deep") wDeep = p;
        else if (e.key === "rem") wRem = p;
        else wAwake = p;
      }

      const curCore = d.core;
      const curDeep = d.deep * wDeep;
      const curRem = d.rem * wRem;
      const curAwake = d.awake * wAwake;
      const sum = curCore + curDeep + curRem + curAwake;
      // Renormalise to the full window; the Phase-A fade is applied via opacity.
      const scale = sum > 0 ? d.span / sum : 0;
      return {
        ...d,
        op,
        deep: curDeep * scale,
        core: curCore * scale,
        rem: curRem * scale,
        awake: curAwake * scale,
      };
    });
  }, [scheduleData, clock]);

  const latest = nights.length ? nights[nights.length - 1] : null;

  if (!loaderDone) {
    return (
      <section className="mx-auto w-full max-w-7xl">
        <SleepLoader onDone={() => setLoaderDone(true)} />
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <style>{`
        @keyframes cardInLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes cardInRight {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes riseIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Sleep</h1>
        {isFetching && allNights.length === 0 ? (
          <span className="text-xs text-muted-foreground">Loading…</span>
        ) : null}
        {allNights.length > 0 ? (
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={windowValue}
            onValueChange={(v) => {
              if (v) setWindowValue(v as WindowValue);
            }}
            className="ml-auto"
          >
            {WINDOWS.map((w) => (
              <ToggleGroupItem key={w.value} value={w.value}>
                {w.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        ) : null}
      </div>

      {allNights.length === 0 && !isFetching ? (
        <p className="text-sm text-muted-foreground">
          No sleep data yet. Import a Health Auto Export file from the{" "}
          <a className="underline" href="/health">
            Health
          </a>{" "}
          page.
        </p>
      ) : null}

      {isFetching && allNights.length === 0 ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </div>
          <Skeleton className="aspect-[3/1] w-full rounded-xl" />
        </div>
      ) : null}

      {nights.length > 0 ? (
      <div
        className="grid gap-3 sm:grid-cols-2"
        style={{ opacity: cardsReady ? 1 : 0 }}
        key={cardsReady ? "cards-in" : "cards-wait"}
      >
        {latest ? <LatestNight night={latest} /> : null}
        <Card
          className="py-0"
          style={{ animation: "cardInRight 600ms ease-out both" }}
        >
          <CardContent className="flex h-full items-center gap-4 px-4 py-3">
            <div
              className="flex-1"
              style={{ animation: "riseIn 450ms ease-out 200ms both" }}
            >
              <p className="text-sm text-muted-foreground">Average per night</p>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                <CountUp value={avgSleep} format={formatHours} />
              </p>
              <p className="text-xs text-muted-foreground">
                Across{" "}
                <CountUp
                  value={nights.length}
                  format={(n) => String(Math.round(n))}
                />{" "}
                night{nights.length === 1 ? "" : "s"}
              </p>
            </div>
            <div
              className="flex flex-1 items-baseline justify-between gap-2 border-l pl-4"
              style={{ animation: "riseIn 450ms ease-out 320ms both" }}
            >
              <div>
                <p className="text-xs text-muted-foreground">Avg bedtime</p>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  <CountUp value={avgBedtime} format={formatClockMinutes} />
                </p>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Avg wake</p>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  <CountUp value={avgWake} format={formatClockMinutes} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      ) : null}

      {scheduleData.length > 0 ? (
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-medium">Bed &amp; wake times</p>
            <ChartContainer config={config} className="aspect-[3/1] w-full">
              <BarChart
                data={displayData}
                margin={{ left: 4, right: 4, top: 4 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                />
                <YAxis
                  width={56}
                  tickLine={false}
                  axisLine={false}
                  domain={scheduleDomain}
                  allowDataOverflow
                  ticks={scheduleTicks}
                  interval={0}
                  tickFormatter={(v) => offsetToClock(Number(v))}
                />
                <ChartTooltip content={<ScheduleTooltip />} />
                <ChartLegend content={<ChartLegendContent />} />
                {/* Transparent spacer floats the stage stack up to bedtime. */}
                <Bar
                  dataKey="base"
                  stackId="s"
                  fill="transparent"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="deep"
                  stackId="s"
                  fill="var(--color-deep)"
                  radius={[0, 0, 3, 3]}
                  isAnimationActive={false}
                  shape={FadeBar}
                />
                <Bar
                  dataKey="core"
                  stackId="s"
                  fill="var(--color-core)"
                  isAnimationActive={false}
                  shape={FadeBar}
                />
                <Bar
                  dataKey="rem"
                  stackId="s"
                  fill="var(--color-rem)"
                  isAnimationActive={false}
                  shape={FadeBar}
                />
                <Bar
                  dataKey="awake"
                  stackId="s"
                  fill="var(--color-awake)"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                  shape={FadeBar}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
