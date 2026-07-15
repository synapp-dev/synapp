"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { Bar, BarChart, Customized, XAxis, YAxis } from "recharts";
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
import { SquareWordmark } from "@/components/branding/square-wordmark";
import {
  BAR_PATHS as SUPERSOLT_MARK_PATHS,
  MARK_VIEWBOX as SUPERSOLT_MARK_VIEWBOX,
} from "@/components/branding/supersolt-mark-draw";
import {
  DashboardCountUp,
  easeOutExpo,
  superslow,
} from "@/entities/dashboard/components/dashboard-count-up";
import { WeatherGlyphShape } from "@/entities/weather/components/weather-glyph";
import {
  forecastAccuracyPct,
  type ForecastDelta,
  type SalesVsForecastChartPoint,
} from "@/entities/sales-insights/lib/sales-forecast-ui";

const chartConfig = {
  actual: {
    label: "Actual",
    color: "var(--brand-supersolt-primary)",
  },
  forecast: {
    label: "Forecast",
    theme: {
      light: "rgb(255 255 255 / 0.55)",
      dark: "rgb(15 23 42 / 0.45)",
    },
  },
} satisfies ChartConfig;

const SALES_HERO_CHART_ID = "sales-insights-hero";

/** Bar draw duration (ms) = headline `DashboardCountUp` `duration` (s). */
const HERO_VALUE_ANIMATION_MS = 1750;

/** How long each face of the x-axis day label shows before crossfading (date <-> weekday). */
const AXIS_LABEL_CYCLE_MS = 5000;
/** Above this many days the weekday face is abbreviated so labels don't collide. */
const AXIS_WEEKDAY_SHORT_THRESHOLD = 10;

const WEATHER_ICON_SIZE = 28;
const WEATHER_TEMP_FONT_SIZE = 18;
/** Horizontal gap between the icon and the temperature to its right. */
const WEATHER_ICON_TEMP_GAP = 5;
/** Vertical span of one weather block (icon and temp sit side by side). */
const WEATHER_BLOCK_HEIGHT = WEATHER_ICON_SIZE;
/** Gap between the block and the top of the column's taller bar. */
const WEATHER_BLOCK_GAP = 16;
/** Below this per-day column width the weather blocks are dropped (long ranges). */
const WEATHER_MIN_BANDWIDTH = 52;
/** Headroom multiplier on the y domain so blocks fit above the tallest bar. */
const WEATHER_Y_DOMAIN_HEADROOM = 1.6;
/**
 * Entrance cascade, per day left-to-right: forecast bar rises, +40ms the
 * actual bar rises, +40ms the weather slides in, then the next day starts
 * ~170ms after this day began. The stagger is wide enough (vs the short
 * bar-rise below) that each bar reads as a distinct step, and the headline
 * number ticks up in visible lockstep with it. Day stagger stays >= 2x the
 * series offset so a day's weather settles before the next day's forecast rises.
 */
const WEATHER_SERIES_OFFSET_MS = 40;
const WEATHER_DAY_STAGGER_MS = 170;
/** Single-bar rise, matching `.weather-seq-bar` in globals (0.42s ease-out). */
const BAR_RISE_DURATION_MS = 420;

/** Approximate rendered width of the temperature label for block centring. */
function tempLabelWidth(tempMaxC: number): number {
  return `${tempMaxC}°`.length * WEATHER_TEMP_FONT_SIZE * 0.55;
}

type SequencedBarShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  index?: number;
};

function roundedTopRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): string {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  return (
    `M${x},${y + r}` +
    ` a${r},${r} 0 0 1 ${r},${-r}` +
    ` h${width - 2 * r}` +
    ` a${r},${r} 0 0 1 ${r},${r}` +
    ` v${height - r}` +
    ` h${-width}` +
    ` Z`
  );
}

/**
 * Custom Bar shape used when weather is shown: recharts' own series-wide
 * animation is disabled and each bar rises from its baseline on a per-day
 * delay instead (`seriesOffsetMs` orders forecast vs actual within the day).
 */
function buildSequencedBarShape(seriesOffsetMs: number) {
  return function SequencedBarShape(props: unknown) {
    const { x, y, width, height, fill, index } =
      props as SequencedBarShapeProps;
    if (
      x === undefined ||
      y === undefined ||
      !width ||
      !height ||
      height <= 0
    ) {
      return <g />;
    }
    const delay = (index ?? 0) * WEATHER_DAY_STAGGER_MS + seriesOffsetMs;
    return (
      <g className="weather-seq-bar" style={{ animationDelay: `${delay}ms` }}>
        <path d={roundedTopRectPath(x, y, width, height, 5)} fill={fill} />
      </g>
    );
  };
}

/** Supersolt mark geometry: the exported viewBox is an 84x78 box. */
const MARK_BOX_WIDTH = 84;
const MARK_BOX_HEIGHT = 78;
/** Forecast bars below these px sizes skip the rotating mark. */
const FORECAST_MARK_MIN_BAR_HEIGHT = 44;
const FORECAST_MARK_MIN_BAR_WIDTH = 16;
const FORECAST_MARK_MAX_SIZE = 26;

/**
 * Custom forecast bar: transparent body with a dotted marching-ants outline
 * and a slow 3D wireframe coin-spin of the brand mark centred in the bar
 * (a foreignObject, because SVG child elements can't take CSS 3D transforms).
 * With weather shown the shape joins the same per-day entrance cascade as the
 * actual bars (`entranceOffsetMs`); pass null to let recharts' own rise
 * animation drive it.
 */
function buildForecastBarShape(entranceOffsetMs: number | null) {
  return function ForecastBarShape(props: unknown) {
    const { x, y, width, height, fill, index } =
      props as SequencedBarShapeProps;
    if (
      x === undefined ||
      y === undefined ||
      !width ||
      !height ||
      height <= 0
    ) {
      return <g />;
    }

    const markWidth = Math.min(width * 0.62, FORECAST_MARK_MAX_SIZE);
    const markHeight = markWidth * (MARK_BOX_HEIGHT / MARK_BOX_WIDTH);
    const showMark =
      height >= FORECAST_MARK_MIN_BAR_HEIGHT &&
      width >= FORECAST_MARK_MIN_BAR_WIDTH;

    const content = (
      <>
        <path
          d={roundedTopRectPath(
            x + 0.75,
            y + 0.75,
            width - 1.5,
            Math.max(height - 1.5, 1),
            5,
          )}
          fill="transparent"
          stroke={fill}
          strokeWidth={1.25}
          strokeDasharray="3 4"
          strokeLinecap="round"
          className="sales-forecast-ants"
        />
        {showMark ? (
          <foreignObject
            x={x + width / 2 - markWidth / 2}
            y={y + height / 2 - markHeight / 2}
            width={markWidth}
            height={markHeight}
            opacity={0.8}
            style={{ overflow: "visible", pointerEvents: "none" }}
          >
            <div
              style={{
                width: markWidth,
                height: markHeight,
                perspective: markWidth * 3,
              }}
            >
              <svg
                viewBox={SUPERSOLT_MARK_VIEWBOX}
                width={markWidth}
                height={markHeight}
                className="sales-forecast-mark-spin"
                style={{ display: "block" }}
                aria-hidden
              >
                {SUPERSOLT_MARK_PATHS.map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    fill="none"
                    stroke={fill}
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
            </div>
          </foreignObject>
        ) : null}
      </>
    );

    if (entranceOffsetMs === null) {
      return <g>{content}</g>;
    }
    const delay = (index ?? 0) * WEATHER_DAY_STAGGER_MS + entranceOffsetMs;
    return (
      <g className="weather-seq-bar" style={{ animationDelay: `${delay}ms` }}>
        {content}
      </g>
    );
  };
}

type WeatherLayerInjectedProps = {
  xAxisMap?: Record<
    string | number,
    { scale: ((value: string) => number) & { bandwidth?: () => number } }
  >;
  yAxisMap?: Record<string | number, { scale: (value: number) => number }>;
  offset?: { top: number };
};

/** rAF count-up for SVG text, matching the hero `DashboardCountUp` easing. */
function useWeatherCountUp(
  end: number,
  durationMs: number,
  delayMs: number,
): number {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    let raf = 0;
    let startTs: number | null = null;
    const timer = window.setTimeout(() => {
      const step = (ts: number) => {
        if (startTs === null) {
          startTs = ts;
        }
        const t = Math.min(ts - startTs, durationMs);
        setValue(easeOutExpo(t, 0, end, durationMs));
        if (t < durationMs) {
          raf = requestAnimationFrame(step);
        }
      };
      raf = requestAnimationFrame(step);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [end, durationMs, delayMs]);

  return value;
}

type WeatherColumnProps = {
  point: SalesVsForecastChartPoint;
  index: number;
  centerX: number;
  /** Pixel y of the top of the column's taller bar (icon block sits above it). */
  barTopY: number;
  plotTop: number;
};

function WeatherColumn({
  point,
  index,
  centerX,
  barTopY,
  plotTop,
}: WeatherColumnProps) {
  const weather = point.weather;
  // Third in the day's cascade: forecast bar, then actual, then weather.
  const delayMs =
    index * WEATHER_DAY_STAGGER_MS + 2 * WEATHER_SERIES_OFFSET_MS;
  const temp = useWeatherCountUp(
    weather?.tempMaxC ?? 0,
    HERO_VALUE_ANIMATION_MS,
    delayMs,
  );

  if (!weather) {
    return null;
  }

  // Sit just above the taller bar; never clip out of the top of the svg.
  const blockTop = Math.max(
    Math.min(plotTop, 2),
    barTopY - WEATHER_BLOCK_GAP - WEATHER_BLOCK_HEIGHT,
  );

  // Centre the [icon][temp] pair over the column; width uses the final temp so
  // the block doesn't shift while the number counts up.
  const hasTemp = weather.tempMaxC !== null;
  const blockWidth =
    WEATHER_ICON_SIZE +
    (hasTemp
      ? WEATHER_ICON_TEMP_GAP + tempLabelWidth(weather.tempMaxC ?? 0)
      : 0);
  const blockLeft = centerX - blockWidth / 2;

  return (
    <g
      className="weather-column-enter"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <g
        transform={`translate(${blockLeft}, ${blockTop}) scale(${WEATHER_ICON_SIZE / 24})`}
      >
        <WeatherGlyphShape kind={weather.kind} />
      </g>
      {hasTemp ? (
        <text
          x={blockLeft + WEATHER_ICON_SIZE + WEATHER_ICON_TEMP_GAP}
          y={blockTop + WEATHER_ICON_SIZE / 2 + WEATHER_TEMP_FONT_SIZE * 0.36}
          textAnchor="start"
          fontSize={WEATHER_TEMP_FONT_SIZE}
          fontWeight={600}
          className="fill-current opacity-80 tabular-nums"
        >
          {Math.round(temp)}°
        </text>
      ) : null}
    </g>
  );
}

/**
 * Recharts `Customized` layer: one animated glyph + counted-up max temperature
 * floating just above each day column's taller bar (actual vs forecast), sliding
 * in from the top left-to-right while the bars rise from the bottom.
 */
function buildWeatherLayer(points: SalesVsForecastChartPoint[]) {
  return function SalesHeroWeatherLayer(props: unknown) {
    const { xAxisMap, yAxisMap, offset } = props as WeatherLayerInjectedProps;
    const xAxis = xAxisMap ? Object.values(xAxisMap)[0] : undefined;
    const yAxis = yAxisMap ? Object.values(yAxisMap)[0] : undefined;
    const xScale = xAxis?.scale;
    const yScale = yAxis?.scale;
    const bandwidth = xScale?.bandwidth?.() ?? 0;
    if (!xScale || !yScale || bandwidth < WEATHER_MIN_BANDWIDTH) {
      return null;
    }

    return (
      <g aria-hidden className="pointer-events-none">
        {points.map((point, index) => {
          if (!point.weather) {
            return null;
          }
          const base = xScale(point.label);
          if (!Number.isFinite(base)) {
            return null;
          }
          const columnMax = Math.max(point.actual ?? 0, point.forecast ?? 0);
          const barTopY = yScale(columnMax);
          if (!Number.isFinite(barTopY)) {
            return null;
          }
          return (
            <WeatherColumn
              key={point.date}
              point={point}
              index={index}
              centerX={base + bandwidth / 2}
              barTopY={barTopY}
              plotTop={offset?.top ?? 0}
            />
          );
        })}
      </g>
    );
  };
}

function formatAud(value: number): string {
  return value.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/** Headline currency with cents, matching the `DashboardCountUp` fallback format. */
function formatHeadlineAud(value: number): string {
  return value.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Evaluate a cubic-bezier easing y for a normalized progress x in [0, 1]. */
function makeBezierEase(p1x: number, p1y: number, p2x: number, p2y: number) {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDerivX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const xEst = sampleX(t) - x;
      if (Math.abs(xEst) < 1e-5) return sampleY(t);
      const deriv = sampleDerivX(t);
      if (Math.abs(deriv) < 1e-6) break;
      t -= xEst / deriv;
    }
    return sampleY(Math.min(1, Math.max(0, t)));
  };
}

/** Same curve as `.weather-seq-bar` so the headline climbs in lockstep with the bars. */
const barRiseEase = makeBezierEase(0.22, 1, 0.36, 1);

type CascadeCountUpProps = {
  points: SalesVsForecastChartPoint[];
  /** Authoritative period total (dollars); the run-up lands here exactly. */
  total: number;
  onEnd?: () => void;
};

/**
 * Headline run-up wired to the per-day bar cascade: each day contributes its
 * share of the total, eased in over that day's actual bar rise (same delay,
 * duration and curve), so the number climbs step-by-step as the bars go up and
 * settles on the exact total when the last bar lands.
 */
function CascadeCountUp({ points, total, onEnd }: CascadeCountUpProps) {
  const [value, setValue] = React.useState(0);
  const onEndRef = React.useRef(onEnd);
  onEndRef.current = onEnd;

  // Per-day dollar contributions, normalized off actuals so they sum to `total`.
  const contributions = React.useMemo(() => {
    const actuals = points.map((p) => Math.max(p.actual ?? 0, 0));
    const sum = actuals.reduce((acc, a) => acc + a, 0);
    if (sum <= 0) {
      return actuals.map(() => 0);
    }
    return actuals.map((a) => (a / sum) * total);
  }, [points, total]);

  React.useEffect(() => {
    const lastIndex = Math.max(points.length - 1, 0);
    const totalMs =
      lastIndex * WEATHER_DAY_STAGGER_MS +
      WEATHER_SERIES_OFFSET_MS +
      BAR_RISE_DURATION_MS;
    let raf = 0;
    let startTs: number | null = null;
    let ended = false;
    const step = (ts: number) => {
      if (startTs === null) {
        startTs = ts;
      }
      const elapsed = ts - startTs;
      let sum = 0;
      for (let i = 0; i < contributions.length; i++) {
        const delay = i * WEATHER_DAY_STAGGER_MS + WEATHER_SERIES_OFFSET_MS;
        const localT = Math.min(
          Math.max(elapsed - delay, 0),
          BAR_RISE_DURATION_MS,
        );
        sum += (contributions[i] ?? 0) * barRiseEase(localT / BAR_RISE_DURATION_MS);
      }
      setValue(sum);
      if (elapsed < totalMs) {
        raf = requestAnimationFrame(step);
      } else if (!ended) {
        ended = true;
        setValue(total);
        onEndRef.current?.();
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [contributions, points.length, total]);

  return (
    <span className={cn("tabular-nums opacity-0", superslow)}>
      {formatHeadlineAud(value)}
    </span>
  );
}

type FitHeadlineProps = {
  /** Widest text the headline will reach (the final counted-up value). */
  finalText: string;
  children: React.ReactNode;
};

/**
 * Scales the headline down (never up) so the final counted-up value always
 * fits the column on one line. An invisible sizer holds `finalText` at the
 * base font size, so the per-frame count-up never triggers re-measurement.
 */
function FitHeadline({ finalText, children }: FitHeadlineProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const sizerRef = React.useRef<HTMLSpanElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    const sizer = sizerRef.current;
    if (!container || !sizer) {
      return;
    }
    const measure = () => {
      const available = container.clientWidth;
      const needed = sizer.scrollWidth;
      setScale(available > 0 && needed > available ? available / needed : 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [finalText]);

  return (
    <div ref={containerRef} className="relative w-full">
      <span
        ref={sizerRef}
        aria-hidden
        className="invisible absolute left-0 top-0 whitespace-nowrap"
      >
        {finalText}
      </span>
      <span
        className="block origin-bottom-left whitespace-nowrap"
        style={scale < 1 ? { fontSize: `${scale}em` } : undefined}
      >
        {children}
      </span>
    </div>
  );
}

type DayAxisTickProps = {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
  weekdayByLabel?: Map<string, string>;
  showWeekday?: boolean;
};

/**
 * X-axis tick with two stacked faces — the date ("8 Jul") and the weekday
 * ("Tuesday") — crossfading on a shared timer so every column flips together.
 * Passed to recharts as an element (not a factory) so toggles update the same
 * mounted <text> nodes and the CSS transition actually plays.
 */
function DayAxisTick({
  x,
  y,
  payload,
  weekdayByLabel,
  showWeekday,
}: DayAxisTickProps) {
  const label = String(payload?.value ?? "");
  const weekday = weekdayByLabel?.get(label);
  const faces = [
    { text: label, visible: !showWeekday || !weekday },
    ...(weekday ? [{ text: weekday, visible: Boolean(showWeekday) }] : []),
  ];
  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      {faces.map((face) => (
        <text
          key={face.text}
          dy="0.71em"
          textAnchor="middle"
          fontSize={11}
          fontWeight={500}
          style={{
            // Inline fill so the ChartContainer's `fill-muted-foreground`
            // tick selector can't darken these on the dark hero surface.
            fill: "currentColor",
            opacity: face.visible ? 0.95 : 0,
            transform: `translateY(${face.visible ? 0 : 4}px)`,
            transition: "opacity 650ms ease, transform 650ms ease",
          }}
        >
          {face.text}
        </text>
      ))}
    </g>
  );
}

/** Bar-chart-shaped placeholder shown while daily sales load. */
const HERO_SKELETON_BAR_HEIGHTS = [64, 92, 54, 116, 80, 100, 60];

function SalesHeroChartSkeleton() {
  return (
    <div
      aria-hidden
      className="flex h-full w-full items-end justify-between gap-2 px-4 pt-6 pb-6"
    >
      {HERO_SKELETON_BAR_HEIGHTS.map((height, index) => (
        <div
          key={index}
          className="flex flex-1 animate-slide-up-fade-in-slow items-end justify-center gap-1"
          style={{ animationDelay: `${index * 70}ms` }}
        >
          <Skeleton
            className="w-1/2 rounded-md bg-white/12 dark:bg-slate-900/12"
            style={{ height }}
          />
          <Skeleton
            className="w-1/2 rounded-md bg-white/6 dark:bg-slate-900/6"
            style={{ height: Math.max(height - 18, 22) }}
          />
        </div>
      ))}
    </div>
  );
}

export type SalesHeroCardProps = {
  revenueCents: number;
  delta: ForecastDelta | null;
  points: SalesVsForecastChartPoint[];
  periodForecastTotal: number | null;
  comparableDayCount: number;
  showForecast: boolean;
  isLoading?: boolean;
  dataSource: "square" | "demo";
  /** Period picker rendered in the card's top-left, beside the "Sales" kicker. */
  periodControls?: React.ReactNode;
  /** Action buttons rendered in the card's top-right, above the chart. */
  actions?: React.ReactNode;
};

export function SalesHeroCard({
  revenueCents,
  delta,
  points,
  periodForecastTotal,
  comparableDayCount,
  showForecast,
  isLoading,
  dataSource,
  periodControls,
  actions,
}: SalesHeroCardProps) {
  const [countUpDone, setCountUpDone] = React.useState(false);

  React.useEffect(() => {
    setCountUpDone(false);
  }, [revenueCents]);

  const hasActual = points.some((p) => p.actual !== null && p.actual > 0);
  const hasChart = hasActual || showForecast;

  const hasPredictionBadge =
    showForecast && periodForecastTotal !== null && periodForecastTotal > 0;
  // Badge waits for the count-up so it lands after the headline settles.
  const predictionBadgeVisible = hasPredictionBadge && countUpDone;

  const hasWeather = points.some((p) => p.weather !== undefined);
  const weatherLayer = React.useMemo(
    () => (hasWeather ? buildWeatherLayer(points) : null),
    [hasWeather, points],
  );

  // Shared date <-> weekday flip for the x-axis labels.
  const [axisShowsWeekday, setAxisShowsWeekday] = React.useState(false);

  // Start the cycle only once the card is revealed, so the first 5s always
  // show the date face before flipping to weekdays.
  const axisCycleActive = !isLoading && hasChart;

  React.useEffect(() => {
    if (!axisCycleActive) {
      return;
    }
    setAxisShowsWeekday(false);
    const timer = window.setInterval(
      () => setAxisShowsWeekday((current) => !current),
      AXIS_LABEL_CYCLE_MS,
    );
    return () => window.clearInterval(timer);
  }, [axisCycleActive]);

  const weekdayByLabel = React.useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-AU", {
      weekday:
        points.length > AXIS_WEEKDAY_SHORT_THRESHOLD ? "short" : "long",
    });
    const map = new Map<string, string>();
    for (const point of points) {
      map.set(point.label, formatter.format(new Date(`${point.date}T00:00:00`)));
    }
    return map;
  }, [points]);


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
      <CardContent className="relative z-10 flex min-h-[256px] flex-col p-0 md:min-h-[280px]">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 pt-4 md:pt-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <CardDescription className="text-xs uppercase tracking-wider text-emerald-200/90 dark:text-slate-600">
              Sales
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
          <div className="flex min-h-0 flex-col justify-end gap-2 px-6 pt-3 pb-4 md:col-span-2 md:pt-4 md:pb-6">
            <CardTitle className="text-6xl leading-none tracking-tight text-white md:text-7xl dark:text-slate-950 animate-slide-up-fade-in-slowest">
              {isLoading ? (
                <Skeleton className="h-12 w-52 rounded-lg bg-white/12 md:h-16 md:w-64 dark:bg-slate-900/12" />
              ) : (
                <FitHeadline finalText={formatHeadlineAud(revenueCents / 100)}>
                  {hasWeather && hasActual ? (
                    <CascadeCountUp
                      points={points}
                      total={revenueCents / 100}
                      onEnd={() => setCountUpDone(true)}
                    />
                  ) : (
                    <DashboardCountUp
                      end={revenueCents / 100}
                      decimals={2}
                      duration={HERO_VALUE_ANIMATION_MS / 1000}
                      prefix="$"
                      separator=","
                      onEnd={() => setCountUpDone(true)}
                    />
                  )}
                </FitHeadline>
              )}
            </CardTitle>
            {hasPredictionBadge ? (
              <>
                <p className="text-xs leading-relaxed text-emerald-200/75 dark:text-slate-600">
                  vs forecast:{" "}
                  <span className="font-medium tabular-nums text-emerald-100 dark:text-slate-900">
                    {formatAud(periodForecastTotal ?? 0)}
                  </span>
                </p>
                {delta ? (
                  predictionBadgeVisible ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={cn(
                            "w-fit cursor-help gap-1.5 rounded-full !py-1 px-2.5 text-xs font-medium opacity-0 animate-slide-up-fade-in-slow [&>svg]:size-3.5",
                            "border-emerald-400/45 bg-emerald-500/15 text-emerald-100 dark:border-emerald-600/50 dark:bg-emerald-600/15 dark:text-emerald-900",
                          )}
                        >
                          <Sparkles className="size-3.5 shrink-0" />
                          <span>
                            Superbot ·{" "}
                            {forecastAccuracyPct(delta).toFixed(1)}% accuracy
                          </span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        Superbot&apos;s point-in-time forecast for the same{" "}
                        {comparableDayCount} day
                        {comparableDayCount === 1 ? "" : "s"}; accuracy is how
                        close actual sales came to it
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    // Reserve the badge's line before it animates in, so the
                    // legend below doesn't jump when the badge lands.
                    <div aria-hidden className="h-[26px]" />
                  )
                ) : null}
              </>
            ) : (
              <p className="text-xs leading-relaxed text-emerald-200/75 dark:text-slate-600">
                {dataSource === "square"
                  ? "Daily actuals vs what the model would have predicted from prior history."
                  : "Connect Square to unlock daily history and forecasts."}
              </p>
            )}
            {showForecast ? (
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-emerald-200/75 dark:text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px] bg-[var(--brand-supersolt-primary)]" />
                  Actual
                </span>
                <span className="lowercase opacity-70">vs.</span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px] border border-dashed border-white/60 dark:border-slate-900/50" />
                  Forecast
                </span>
              </div>
            ) : null}
          </div>

        <div
          className={cn(
            "relative flex min-h-[150px] min-w-0 flex-col border-t border-white/10 md:col-span-3 md:h-full md:min-h-0 md:border-t-0 dark:border-slate-900/10",
            hasWeather && "min-h-[200px]",
          )}
        >
          {isLoading ? (
            <SalesHeroChartSkeleton />
          ) : hasChart ? (
            <ChartContainer
              id={SALES_HERO_CHART_ID}
              config={chartConfig}
              className="aspect-auto h-full min-h-[150px] w-full max-w-none flex-1 px-3 pt-4 pb-4 md:pb-6 [&_.recharts-responsive-container]:!h-full"
            >
              <BarChart
                accessibilityLayer
                data={points}
                margin={{ left: 4, right: 4, top: 4, bottom: 0 }}
                barGap={3}
              >
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval="preserveStartEnd"
                  minTickGap={24}
                  tick={
                    <DayAxisTick
                      weekdayByLabel={weekdayByLabel}
                      showWeekday={axisShowsWeekday}
                    />
                  }
                />
                {hasWeather ? (
                  <YAxis
                    hide
                    domain={[
                      0,
                      (dataMax: number) => dataMax * WEATHER_Y_DOMAIN_HEADROOM,
                    ]}
                  />
                ) : null}
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      className={cn(
                        "border-white/15 bg-emerald-950/95 text-green-50 shadow-2xl backdrop-blur-sm",
                        "dark:border-slate-900/12 dark:bg-white/95 dark:text-slate-900",
                      )}
                      labelClassName="text-emerald-200/90 dark:text-slate-600"
                      labelFormatter={(label, payload) => {
                        const point = payload?.[0]?.payload as
                          | SalesVsForecastChartPoint
                          | undefined;
                        if (!point?.weather) {
                          return label;
                        }
                        return (
                          <span>
                            {label}
                            <span className="ml-1.5 font-normal opacity-80">
                              {point.weather.label}
                            </span>
                          </span>
                        );
                      }}
                      formatter={(value, name, item) => (
                        <>
                          <span
                            className="size-2 shrink-0 rounded-[2px]"
                            style={{ background: item.color }}
                          />
                          <span className="text-emerald-200/90 dark:text-slate-600">
                            {name === "actual" ? "Actual" : "Forecast"}
                          </span>
                          <span className="ml-auto font-medium tabular-nums">
                            {formatAud(Number(value))}
                          </span>
                        </>
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="actual"
                  fill="var(--color-actual)"
                  radius={[5, 5, 0, 0]}
                  isAnimationActive={!hasWeather}
                  animationDuration={HERO_VALUE_ANIMATION_MS}
                  animationEasing="ease-out"
                  shape={
                    hasWeather
                      ? buildSequencedBarShape(WEATHER_SERIES_OFFSET_MS)
                      : undefined
                  }
                />
                {showForecast ? (
                  <Bar
                    dataKey="forecast"
                    fill="var(--color-forecast)"
                    radius={[5, 5, 0, 0]}
                    isAnimationActive={!hasWeather}
                    animationDuration={HERO_VALUE_ANIMATION_MS}
                    animationEasing="ease-out"
                    shape={buildForecastBarShape(hasWeather ? 0 : null)}
                  />
                ) : null}
                {weatherLayer ? (
                  <Customized component={weatherLayer} />
                ) : null}
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-xs text-emerald-200/70 dark:text-slate-500">
              {dataSource === "square"
                ? "No daily sales history in this range yet — run a Square import from DevKit."
                : "Daily revenue appears here once Square is connected."}
            </div>
          )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
