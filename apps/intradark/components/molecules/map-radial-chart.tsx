"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";

export type MapRadialChartProps = {
  mapCounts: Record<string, number>;
  mapWinLossCounts?: Record<
    string,
    { win: number; loss: number; total: number }
  >;
  className?: string;
};

export function MapRadialChart({
  mapCounts,
  mapWinLossCounts,
  className,
}: MapRadialChartProps) {
  let data: { map: string; win: number; loss: number }[] = [];
  if (mapWinLossCounts) {
    data = Object.entries(mapWinLossCounts).map(([map, { win, loss }]) => ({
      map:
        map.replace(/^de_/, "").charAt(0).toUpperCase() +
        map.replace(/^de_/, "").slice(1),
      win,
      loss,
    }));
  } else {
    data = Object.entries(mapCounts).map(([map, count]) => ({
      map:
        map.replace(/^de_/, "").charAt(0).toUpperCase() +
        map.replace(/^de_/, "").slice(1),
      win: count,
      loss: 0,
    }));
  }

  if (data.length === 0) return null;

  // Determine which series (win or loss) has the higher max value, and render that last (on top)
  const maxWin = Math.max(...data.map((d) => d.win));
  const maxLoss = Math.max(...data.map((d) => d.loss));
  const renderOrder = maxWin >= maxLoss ? ["loss", "win"] : ["win", "loss"];

  // Chart config for design system colors and labels
  const chartConfig: ChartConfig = {
    win: {
      label: "Wins",
      color: "var(--chart-1)",
    },
    loss: {
      label: "Losses",
      color: "var(--chart-2)",
    },
  };

  return (
    <div
      className={`w-full h-full overflow-visible ${className ? className : ""}`}
    >
      <ChartContainer config={chartConfig} className="flex justify-center">
        <RadarChart data={data} outerRadius={70}>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <PolarGrid />
          <PolarAngleAxis dataKey="map" />
          {renderOrder.map((key) => (
            <Radar
              key={key}
              name={chartConfig[key]?.label as string}
              dataKey={key}
              stroke={chartConfig[key]?.color as string}
              fill={chartConfig[key]?.color as string}
              fillOpacity={0.8}
            />
          ))}
        </RadarChart>
      </ChartContainer>
    </div>
  );
}
