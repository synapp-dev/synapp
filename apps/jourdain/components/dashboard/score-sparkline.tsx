"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import type { DayScore } from "@/lib/scoring/compute";

const config = {
  score: { label: "Score", color: "var(--chart-1)" },
} satisfies ChartConfig;

function shortDate(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM");
  } catch {
    return iso;
  }
}

/** 30-day score trend. Days with nothing scheduled leave a gap in the line. */
export function ScoreSparkline({ history }: { history: DayScore[] }) {
  const points = useMemo(
    () => history.map((day) => ({ date: day.date, score: day.score })),
    [history]
  );
  const hasData = points.some((point) => point.score !== null);

  if (!hasData) {
    return (
      <div className="flex h-24 w-full items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
        Scores will chart here as days get scored
      </div>
    );
  }

  return (
    <ChartContainer config={config} className="h-24 w-full">
      <AreaChart data={points} margin={{ left: 4, right: 4, top: 6, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tickLine={false}
          axisLine={false}
          minTickGap={48}
          tick={{ fontSize: 10 }}
        />
        <YAxis hide domain={[0, 100]} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => shortDate(String(value))}
              formatter={(value) => `${Math.round(Number(value))} / 100`}
            />
          }
        />
        <Area
          dataKey="score"
          type="monotone"
          connectNulls
          stroke="var(--color-score)"
          fill="var(--color-score)"
          fillOpacity={0.14}
          strokeWidth={2}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
