"use client";

import { RadialBar, RadialBarChart } from "recharts";

import { Card, CardContent } from "@workspace/ui/components/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { cn } from "@workspace/ui/lib/utils";

/** Placeholder until Veritas scoring is wired to real player data. */
const DUMMY_CHART_DATA = [
  { metric: "aim", score: 82, fill: "var(--color-aim)" },
  { metric: "utility", score: 71, fill: "var(--color-utility)" },
  { metric: "entry", score: 88, fill: "var(--color-entry)" },
  { metric: "clutch", score: 65, fill: "var(--color-clutch)" },
  { metric: "consistency", score: 74, fill: "var(--color-consistency)" },
] as const;

const chartConfig = {
  score: {
    label: "Score",
  },
  aim: {
    label: "Aim",
    color: "var(--chart-1)",
  },
  utility: {
    label: "Utility",
    color: "var(--chart-2)",
  },
  entry: {
    label: "Entry",
    color: "var(--chart-3)",
  },
  clutch: {
    label: "Clutch",
    color: "var(--chart-4)",
  },
  consistency: {
    label: "Consistency",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

export interface VeritasSummaryProps {
  className?: string;
}

export function VeritasSummary({ className }: VeritasSummaryProps) {
  return (
    <Card
      className={cn(
        "border-white/10 bg-black/25 py-0 text-white shadow-none backdrop-blur-sm",
        className,
      )}
    >
      <CardContent className="flex items-center gap-2 p-2 sm:gap-3 sm:p-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-tight text-white/90 sm:text-sm">
            Veritas Summary
          </p>
          <p className="mt-0.5 text-[10px] leading-tight text-white/45 sm:text-[11px]">
            Last 30 matches · demo
          </p>
        </div>
        <ChartContainer
          config={chartConfig}
          className="aspect-square h-[5.5rem] w-[5.5rem] shrink-0 sm:h-[6rem] sm:w-[6rem]"
        >
          <RadialBarChart
            data={[...DUMMY_CHART_DATA]}
            innerRadius={16}
            outerRadius={42}
          >
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="metric" />}
            />
            <RadialBar dataKey="score" background />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
