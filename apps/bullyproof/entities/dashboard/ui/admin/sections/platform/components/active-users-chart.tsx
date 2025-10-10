"use client";

import { TrendingUp } from "lucide-react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
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

interface ActiveUsersChartProps {
  activeUsersChart: {
    title: string;
    data: Array<{
      week: string;
      users: number;
    }>;
    trend: {
      percentage: string;
      direction: "up" | "down";
      description: string;
    };
  };
}

const chartConfig = {
  users: {
    label: "Active Users",
    color: "hsl(180, 70%, 50%)",
  },
} satisfies ChartConfig;

export function ActiveUsersChart({ activeUsersChart }: ActiveUsersChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{activeUsersChart.title}</CardTitle>
        <CardDescription>
          User engagement trends over the past 8 weeks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={activeUsersChart.data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.replace("Week ", "W")}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Line
              dataKey="users"
              type="monotone"
              stroke="var(--color-users)"
              strokeWidth={2}
              dot={{
                fill: "var(--color-users)",
                strokeWidth: 2,
                r: 4,
              }}
              activeDot={{
                r: 6,
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              {activeUsersChart.trend.description}{" "}
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              {activeUsersChart.trend.percentage} vs previous period
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
