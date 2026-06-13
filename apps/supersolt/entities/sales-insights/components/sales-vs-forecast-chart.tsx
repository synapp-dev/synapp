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
import type { SalesVsForecastChartPoint } from "@/entities/sales-insights/lib/sales-forecast-ui";

const chartConfig = {
  actual: {
    label: "Actual",
    color: "var(--chart-1)",
  },
  forecast: {
    label: "Forecast",
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

export type SalesVsForecastChartProps = {
  points: SalesVsForecastChartPoint[];
  periodActualTotal: number;
  periodForecastTotal: number | null;
  comparableDayCount?: number;
  showForecast: boolean;
  isLoading?: boolean;
};

export function SalesVsForecastChart({
  points,
  periodActualTotal,
  periodForecastTotal,
  comparableDayCount,
  showForecast,
  isLoading,
}: SalesVsForecastChartProps) {
  const hasActual = points.some((p) => p.actual !== null && p.actual > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Sales vs forecast</CardTitle>
        <CardDescription className="text-xs">
          Daily revenue (actual) vs point-in-time forecast — for each day, what the
          model would have predicted using only prior sales history.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground py-16 text-center text-sm">
            Loading forecast data…
          </p>
        ) : !hasActual && !showForecast ? (
          <p className="text-muted-foreground py-16 text-center text-sm">
            No daily sales history for this range yet. Run a Square import from
            DevKit or open a range with synced sales.
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
                minTickGap={24}
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
      {hasActual || showForecast ? (
        <CardFooter className="flex-col items-start gap-1.5 py-3 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1 leading-none font-medium">
            <span>
              Period actual:{" "}
              <span className="tabular-nums">{formatAud(periodActualTotal)}</span>
            </span>
            {showForecast &&
            periodForecastTotal !== null &&
            periodForecastTotal > 0 ? (
              <span>
                Forecast (same {comparableDayCount ?? "—"} days):{" "}
                <span className="tabular-nums">
                  {formatAud(periodForecastTotal)}
                </span>
              </span>
            ) : null}
          </div>
          <div className="text-muted-foreground leading-none">
            Grouped bars compare actual and forecast revenue per day in the selected
            range.
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}
