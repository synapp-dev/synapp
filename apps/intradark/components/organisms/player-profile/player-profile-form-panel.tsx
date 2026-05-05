"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChevronsDown, ChevronsUp } from "lucide-react";

import {
  FORM_SHOWCASE,
  type FormMetricKey,
  type FormTimeRange,
} from "@/lib/player-profile-showcase-data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  ChartContainer,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { cn } from "@workspace/ui/lib/utils";

const chartConfig = {
  value: {
    label: "Value",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const metricOrder: FormMetricKey[] = [
  "rating",
  "kdr",
  "kpr",
  "dpr",
  "adr",
  "impact",
];

const sectionShell =
  "border-white/10 bg-[#0a0f1c] text-white shadow-black/40 shadow-xl";

const pillToggleClass =
  "data-[state=on]:border-primary data-[state=on]:text-primary-foreground data-[state=on]:bg-primary/15 border-white/20 text-white/70";

export type PlayerProfileFormPanelProps = {
  playerId: string;
  className?: string;
};

export function PlayerProfileFormPanel({
  playerId,
  className,
}: PlayerProfileFormPanelProps) {
  void playerId;
  const [timeRange, setTimeRange] = useState<FormTimeRange>("all");
  const [metric, setMetric] = useState<FormMetricKey>("rating");

  const m = FORM_SHOWCASE.metrics[metric];
  const series = useMemo(
    () => (timeRange === "recent" ? m.recent : m.allTime),
    [m, timeRange],
  );
  const summary =
    timeRange === "recent" ? m.summaryRecent : m.summaryAll;
  const gradientId = `form-area-${metric}-${timeRange}`;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-row flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight text-white">Form</h2>
        <ToggleGroup
          type="single"
          value={timeRange}
          onValueChange={(v) => {
            if (v === "recent" || v === "all") setTimeRange(v);
          }}
          variant="outline"
          size="sm"
          spacing={0}
          className="rounded-full border border-white/15 bg-black/20 p-0.5"
        >
          <ToggleGroupItem
            value="recent"
            aria-label="Recent"
            className={cn("rounded-full px-3 py-1.5 text-xs", pillToggleClass)}
          >
            Recent
          </ToggleGroupItem>
          <ToggleGroupItem
            value="all"
            aria-label="All time"
            className={cn("rounded-full px-3 py-1.5 text-xs", pillToggleClass)}
          >
            All Time
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Card className={cn("gap-0 py-0", sectionShell)}>
        <CardHeader className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base font-medium text-white/90">
              {m.label}
            </CardTitle>
            <div className="flex flex-row flex-wrap items-center gap-2">
              <span className="text-3xl font-bold tabular-nums text-white sm:text-4xl">
                {m.format(summary)}
              </span>
              {m.trendUp ? (
                <ChevronsUp
                  className="text-chart-2 shrink-0"
                  aria-label="Trending up"
                />
              ) : (
                <ChevronsDown
                  className="text-chart-1 shrink-0"
                  aria-label="Trending down"
                />
              )}
            </div>
          </div>
          <ToggleGroup
            type="single"
            value={metric}
            onValueChange={(v) => {
              if (metricOrder.includes(v as FormMetricKey)) {
                setMetric(v as FormMetricKey);
              }
            }}
            variant="outline"
            size="sm"
            className="grid w-full max-w-[220px] grid-cols-3 gap-1.5 sm:max-w-none"
          >
            {metricOrder.map((key) => {
              const label = FORM_SHOWCASE.metrics[key].label;
              return (
                <ToggleGroupItem
                  key={key}
                  value={key}
                  aria-label={label}
                  className={cn(
                    "h-8 min-w-0 px-2 text-[11px] font-medium",
                    "data-[state=on]:border-chart-2 data-[state=on]:text-chart-2 data-[state=on]:bg-chart-2/10",
                    "border-white/20 text-white/55",
                  )}
                >
                  {label}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-2 sm:px-6">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-36 w-full sm:h-40 [&_.recharts-responsive-container]:max-h-none"
          >
            <AreaChart
              accessibilityLayer
              data={series}
              margin={{ left: 0, right: 0, top: 4, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-value)"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-value)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeOpacity={0} />
              <XAxis dataKey="x" hide />
              <YAxis hide />
              <Area
                dataKey="value"
                type="monotone"
                fill={`url(#${gradientId})`}
                stroke="var(--color-value)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
