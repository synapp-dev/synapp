"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import type { HourlyChartPoint } from "@/entities/sales-insights/lib/sales-hourly-ui";

const chartConfig = {
  actual: {
    label: "Actual",
    color: "var(--chart-1)",
  },
  forecast: {
    label: "Expected",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const chartContainerClassName =
  "aspect-auto h-[140px] w-full [&_.recharts-responsive-container]:!h-full";

function formatAud(value: number): string {
  return value.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export type SalesHourlyDayChartProps = {
  points: HourlyChartPoint[];
  dayLabel: string;
  dailyForecastTotal: number | null;
  isToday: boolean;
  isLoading?: boolean;
};

export function SalesHourlyDayChart({
  points,
  dayLabel,
  dailyForecastTotal,
  isToday,
  isLoading,
}: SalesHourlyDayChartProps) {
  const showForecast = points.some((point) => point.forecast !== null);
  const actualTotal = points.reduce((sum, point) => sum + (point.actual ?? 0), 0);
  const forecastTotal = points.reduce((sum, point) => sum + (point.forecast ?? 0), 0);
  const hasChartData = points.length > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Hourly breakdown</CardTitle>
        <CardDescription className="text-xs">
          {dayLabel}
          {isToday ? " (live)" : ""} — actual revenue by hour
          {showForecast
            ? "; expected hours use the daily forecast split by recent same-weekday patterns"
            : ""}
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground py-16 text-center text-sm">
            Loading hourly pattern…
          </p>
        ) : !hasChartData ? (
          <p className="text-muted-foreground py-16 text-center text-sm">
            No hourly sales yet for this day.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className={chartContainerClassName}>
            <BarChart accessibilityLayer data={points}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={8}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dashed"
                    formatter={(value) => formatAud(Number(value))}
                  />
                }
              />
              <Bar dataKey="actual" fill="var(--color-actual)" radius={4} />
              {showForecast ? (
                <Bar dataKey="forecast" fill="var(--color-forecast)" radius={4} />
              ) : null}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      {hasChartData ? (
        <CardFooter className="flex-col items-start gap-1.5 py-3 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1 leading-none font-medium">
            <span>
              Actual so far:{" "}
              <span className="tabular-nums">{formatAud(actualTotal)}</span>
            </span>
            {showForecast ? (
              <span>
                Expected (hourly split):{" "}
                <span className="tabular-nums">{formatAud(forecastTotal)}</span>
              </span>
            ) : null}
            {dailyForecastTotal !== null && dailyForecastTotal > 0 ? (
              <span>
                Daily forecast:{" "}
                <span className="tabular-nums">
                  {formatAud(dailyForecastTotal)}
                </span>
              </span>
            ) : null}
          </div>
          <div className="text-muted-foreground leading-none">
            Hover a bar for exact amounts; expected hours are derived from today’s
            daily forecast.
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}
