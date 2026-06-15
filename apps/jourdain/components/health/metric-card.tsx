"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { formatMetric, type MetricMeta } from "@/lib/health/metrics";
import type { HealthMetricSample } from "@/hooks/health/use-health";

function shortDate(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM");
  } catch {
    return iso;
  }
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function CardShell({
  meta,
  latest,
  average,
  subtitle,
  children,
}: {
  meta: MetricMeta;
  latest: number | null;
  average: number | null;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-muted-foreground">
              {meta.label}
            </p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">
              {formatMetric(latest, meta)}
            </p>
            <p className="text-xs text-muted-foreground">
              {subtitle ??
                (average != null
                  ? `Avg ${formatMetric(average, meta)}`
                  : "No data yet")}
            </p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/** A labelled stat + area-chart trend for a single daily metric. */
export function MetricCard({
  meta,
  samples,
}: {
  meta: MetricMeta;
  samples: HealthMetricSample[];
}) {
  const points = useMemo(
    () =>
      samples
        .filter((s) => s.qty != null)
        .map((s) => ({ date: s.date, value: s.qty as number })),
    [samples]
  );

  const latest = points.at(-1)?.value ?? null;
  const average = mean(points.map((p) => p.value));

  const config = {
    value: { label: meta.label, color: "var(--chart-1)" },
  } satisfies ChartConfig;

  return (
    <CardShell meta={meta} latest={latest} average={average}>
      {points.length > 0 ? (
        <ChartContainer config={config} className="aspect-[3/1] w-full">
          <AreaChart data={points} margin={{ left: 4, right: 4, top: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis hide domain={["auto", "auto"]} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(v) => shortDate(String(v))}
                  formatter={(value) => formatMetric(Number(value), meta)}
                />
              }
            />
            <Area
              dataKey="value"
              type="monotone"
              stroke="var(--color-value)"
              fill="var(--color-value)"
              fillOpacity={0.15}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      ) : (
        <ChartEmpty />
      )}
    </CardShell>
  );
}

/** Heart-rate style card: shaded min–max band with an average line. */
export function RangeMetricCard({
  meta,
  samples,
}: {
  meta: MetricMeta;
  samples: HealthMetricSample[];
}) {
  const points = useMemo(
    () =>
      samples
        .filter((s) => s.avg != null || s.qty != null)
        .map((s) => ({
          date: s.date,
          avg: (s.avg ?? s.qty) as number,
          min: s.min,
          max: s.max,
          // Area is stacked from min upward by (max - min) to draw the band.
          band: s.min != null && s.max != null ? s.max - s.min : null,
        })),
    [samples]
  );

  const latest = points.at(-1)?.avg ?? null;
  const average = mean(points.map((p) => p.avg));

  const config = {
    avg: { label: `Avg ${meta.label}`, color: "var(--chart-1)" },
    band: { label: "Range", color: "var(--chart-1)" },
  } satisfies ChartConfig;

  return (
    <CardShell meta={meta} latest={latest} average={average}>
      {points.length > 0 ? (
        <ChartContainer config={config} className="aspect-[3/1] w-full">
          <ComposedChart data={points} margin={{ left: 4, right: 4, top: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis hide domain={["auto", "auto"]} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(v) => shortDate(String(v))}
                  formatter={(value, name) =>
                    name === "avg"
                      ? formatMetric(Number(value), meta)
                      : undefined
                  }
                />
              }
            />
            {/* Transparent base up to min, then a shaded band of (max - min). */}
            <Area
              dataKey="min"
              stackId="band"
              stroke="none"
              fill="transparent"
              isAnimationActive={false}
            />
            <Area
              dataKey="band"
              stackId="band"
              stroke="none"
              fill="var(--color-band)"
              fillOpacity={0.12}
              isAnimationActive={false}
            />
            <Line
              dataKey="avg"
              type="monotone"
              stroke="var(--color-avg)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartContainer>
      ) : (
        <ChartEmpty />
      )}
    </CardShell>
  );
}

function ChartEmpty() {
  return (
    <div className="flex aspect-[3/1] w-full items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
      No data in this export
    </div>
  );
}
