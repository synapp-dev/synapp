"use client";

import * as React from "react";
import { Bar, BarChart, XAxis } from "recharts";

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
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { cn } from "@workspace/ui/lib/utils";

import type { DashboardTrendPoint } from "@/entities/dashboard/model/dummy-dashboard-data";

const chartConfig = {
  value: {
    label: "Sales",
    color: "var(--brand-supersolt-primary)",
  },
} satisfies ChartConfig;

export type DashboardRevenueTrendCardProps = {
  points: DashboardTrendPoint[];
  title?: string;
  description?: string;
  className?: string;
};

export function DashboardRevenueTrendCard({
  points,
  title = "Daily sales",
  description = "Last 7 days (mock)",
  className,
}: DashboardRevenueTrendCardProps) {
  const max = React.useMemo(
    () => Math.max(...points.map((p) => p.value), 1),
    [points],
  );

  return (
    <Card className={cn("gap-0", className)}>
      <CardHeader className="pb-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[220px] w-full max-w-none [&_.recharts-responsive-container]:!h-full"
        >
          <BarChart
            accessibilityLayer
            data={points}
            margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
          >
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="value"
              name="value"
              fill="var(--color-value)"
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ChartContainer>
        <p className="mt-2 text-xs text-muted-foreground">
          Scale max {max.toLocaleString()} · Square sync mock: last updated 4m ago
        </p>
      </CardContent>
    </Card>
  );
}
