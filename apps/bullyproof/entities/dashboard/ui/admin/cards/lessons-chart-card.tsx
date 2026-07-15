"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";
import { Button } from "@workspace/ui/components/button";

interface LessonsChartCardProps {
  title: string;
  data: Array<{
    month: string;
    independent: number;
    catholic: number;
    government: number;
  }>;
  trend: {
    percentage: string;
    direction: "up" | "down";
    description: string;
  };
}

const chartConfig = {
  independent: {
    label: "Independent",
    color: "#3b82f6", // Blue
  },
  catholic: {
    label: "Catholic",
    color: "#10b981", // Emerald
  },
  government: {
    label: "Government",
    color: "#f59e0b", // Amber
  },
} satisfies ChartConfig;

export function LessonsChartCard({
  title,
  data,
  trend,
}: LessonsChartCardProps) {
  const [visibleSeries, setVisibleSeries] = useState({
    government: true,
    catholic: true,
    independent: true,
  });

  const toggleSeries = (series: keyof typeof visibleSeries) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [series]: !prev[series],
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant={visibleSeries.government ? "default" : "outline"}
              size="sm"
              onClick={() => toggleSeries("government")}
              className="text-xs h-fit py-1"
              style={{
                backgroundColor: visibleSeries.government
                  ? "#f59e0b"
                  : undefined,
                borderColor: "#f59e0b",
                color: visibleSeries.government ? "white" : "#f59e0b",
              }}
            >
              Government
            </Button>
            <Button
              variant={visibleSeries.catholic ? "default" : "outline"}
              size="sm"
              onClick={() => toggleSeries("catholic")}
              className="text-xs h-fit py-1"
              style={{
                backgroundColor: visibleSeries.catholic ? "#10b981" : undefined,
                borderColor: "#10b981",
                color: visibleSeries.catholic ? "white" : "#10b981",
              }}
            >
              Catholic
            </Button>
            <Button
              variant={visibleSeries.independent ? "default" : "outline"}
              size="sm"
              onClick={() => toggleSeries("independent")}
              className="text-xs h-fit py-1"
              style={{
                backgroundColor: visibleSeries.independent
                  ? "#3b82f6"
                  : undefined,
                borderColor: "#3b82f6",
                color: visibleSeries.independent ? "white" : "#3b82f6",
              }}
            >
              Independent
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <defs>
              <linearGradient id="fillGovernment" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillCatholic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillIndependent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            {visibleSeries.government && (
              <Area
                dataKey="government"
                type="natural"
                fill="url(#fillGovernment)"
                fillOpacity={0.4}
                stroke="#f59e0b"
                stackId="a"
              />
            )}
            {visibleSeries.catholic && (
              <Area
                dataKey="catholic"
                type="natural"
                fill="url(#fillCatholic)"
                fillOpacity={0.4}
                stroke="#10b981"
                stackId="a"
              />
            )}
            {visibleSeries.independent && (
              <Area
                dataKey="independent"
                type="natural"
                fill="url(#fillIndependent)"
                fillOpacity={0.4}
                stroke="#3b82f6"
                stackId="a"
              />
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              {trend.description} <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              January - June 2024
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
