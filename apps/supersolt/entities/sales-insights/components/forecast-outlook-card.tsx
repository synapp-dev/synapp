"use client";

import { useMemo } from "react";
import { Area, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { cn } from "@workspace/ui/lib/utils";
import { TrendingUp } from "lucide-react";
import { WeatherGlyphIcon } from "@/entities/weather/components/weather-glyph";
import { formatCurrency } from "@/entities/sales-insights/lib/sales-format";
import type {
  ForecastDriverChip,
  ForecastOutlookDay,
} from "@/entities/sales-insights/lib/sales-forecast-ui";

const chartConfig = {
  forecast: {
    label: "Forecast",
    color: "var(--brand-supersolt-primary)",
  },
  band: {
    label: "Expected range",
    color: "var(--brand-supersolt-primary)",
  },
} satisfies ChartConfig;

const DRIVER_TONE_CLASS: Record<ForecastDriverChip["tone"], string> = {
  up: "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300",
  down: "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300",
  neutral: "text-muted-foreground",
};

const CONFIDENCE_LABEL: Record<ForecastOutlookDay["confidence"], string> = {
  low: "Low",
  medium: "Med",
  high: "High",
};

type OutlookChartPoint = {
  date: string;
  label: string;
  forecast: number;
  band: [number, number] | null;
};

function DriverChips({ drivers }: { drivers: ForecastDriverChip[] }) {
  if (drivers.length === 0) {
    return null;
  }
  return (
    <span className="flex flex-wrap items-center gap-1">
      {drivers.map((chip) => (
        <Badge
          key={chip.key}
          variant="outline"
          className={cn(
            "px-1.5 py-0 text-[10px] font-normal",
            DRIVER_TONE_CLASS[chip.tone],
          )}
        >
          {chip.label}
        </Badge>
      ))}
    </span>
  );
}

type ForecastOutlookTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: OutlookChartPoint }>;
  daysByDate: Map<string, ForecastOutlookDay>;
};

function ForecastOutlookTooltip({
  active,
  payload,
  daysByDate,
}: ForecastOutlookTooltipProps) {
  const point = payload?.[0]?.payload;
  const day = point ? daysByDate.get(point.date) : undefined;
  if (!active || !day) {
    return null;
  }
  return (
    <div className="border-border/50 bg-background grid min-w-[10rem] gap-1.5 rounded-lg border px-3 py-2 text-xs shadow-xl">
      <p className="font-medium">
        {day.weekday} {day.label}
        {day.weather ? (
          <span className="text-muted-foreground ml-1.5 font-normal">
            {day.weather.label}
          </span>
        ) : null}
      </p>
      {day.closed ? (
        <p className="text-muted-foreground">Marked closed, no trade expected.</p>
      ) : (
        <>
          <p className="tabular-nums">
            <span className="text-muted-foreground">Revenue</span>{" "}
            <span className="font-medium">{formatCurrency(day.revenueCents)}</span>
            {day.revenueLowerCents !== null && day.revenueUpperCents !== null ? (
              <span className="text-muted-foreground">
                {" "}
                ({formatCurrency(day.revenueLowerCents)} –{" "}
                {formatCurrency(day.revenueUpperCents)})
              </span>
            ) : null}
          </p>
          {day.orders !== null ? (
            <p className="tabular-nums">
              <span className="text-muted-foreground">Orders</span>{" "}
              <span className="font-medium">{day.orders}</span>
              {day.avgCheckCents !== null ? (
                <span className="text-muted-foreground">
                  {" "}
                  · avg check {formatCurrency(day.avgCheckCents)}
                </span>
              ) : null}
            </p>
          ) : null}
        </>
      )}
      <DriverChips drivers={day.drivers} />
    </div>
  );
}

export type ForecastOutlookCardProps = {
  days: ForecastOutlookDay[];
};

/**
 * The forward view: revenue line inside its confidence band for the next two
 * weeks, then a per-day breakdown with everything driving each number.
 */
export function ForecastOutlookCard({ days }: ForecastOutlookCardProps) {
  const chartPoints = useMemo(
    (): OutlookChartPoint[] =>
      days.map((day) => ({
        date: day.date,
        label: day.label,
        forecast: day.revenueCents / 100,
        band:
          day.revenueLowerCents !== null && day.revenueUpperCents !== null
            ? [day.revenueLowerCents / 100, day.revenueUpperCents / 100]
            : null,
      })),
    [days],
  );
  const daysByDate = useMemo(
    () => new Map(days.map((day) => [day.date, day])),
    [days],
  );

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b px-5 py-4 [.border-b]:pb-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="text-muted-foreground h-4 w-4" />
            Next 14 days
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Expected revenue with its confidence band. The shaded range is where
            actuals have historically landed on days like each of these.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="border-b px-2 pt-4 pb-2">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-56 w-full"
        >
          <ComposedChart
            accessibilityLayer
            data={chartPoints}
            margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
          >
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={24}
              fontSize={11}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              fontSize={11}
              tickFormatter={(value: number) =>
                value >= 1000
                  ? `$${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`
                  : `$${Math.round(value)}`
              }
            />
            <ChartTooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={<ForecastOutlookTooltip daysByDate={daysByDate} />}
            />
            <Area
              dataKey="band"
              stroke="none"
              fill="var(--color-band)"
              fillOpacity={0.14}
              isAnimationActive={false}
              activeDot={false}
              connectNulls
            />
            <Line
              dataKey="forecast"
              stroke="var(--color-forecast)"
              strokeWidth={2}
              dot={{ r: 2.5, strokeWidth: 0, fill: "var(--color-forecast)" }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>

      <CardContent className="px-0 py-0">
        <ul className="divide-y">
          {days.map((day) => (
            <li
              key={day.date}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5",
                day.isToday && "bg-muted/40",
              )}
            >
              <div className="w-24 shrink-0">
                <p className="text-sm font-medium">
                  {day.isToday ? "Today" : day.weekday}
                </p>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {day.label}
                </p>
              </div>
              {day.weather ? (
                <span
                  className="text-muted-foreground flex w-14 shrink-0 items-center gap-1 text-xs tabular-nums"
                  title={day.weather.label}
                >
                  <WeatherGlyphIcon kind={day.weather.kind} size={16} />
                  {day.weather.tempMaxC !== null
                    ? `${day.weather.tempMaxC}°`
                    : null}
                </span>
              ) : (
                <span className="w-14 shrink-0" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <DriverChips drivers={day.drivers} />
              </div>
              <div className="shrink-0 text-right">
                {day.closed ? (
                  <p className="text-muted-foreground text-sm">Closed</p>
                ) : (
                  <>
                    <p className="text-sm font-medium tabular-nums">
                      {formatCurrency(day.revenueCents)}
                    </p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {day.revenueLowerCents !== null &&
                      day.revenueUpperCents !== null
                        ? `${formatCurrency(day.revenueLowerCents)} – ${formatCurrency(day.revenueUpperCents)}`
                        : `${CONFIDENCE_LABEL[day.confidence]} confidence`}
                    </p>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
