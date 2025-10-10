"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

interface LessonsWeeklyChartProps {
  lessonsWeeklyChart: {
    title: string;
    data: Array<{
      week: string;
      independent: number;
      catholic: number;
      government: number;
    }>;
  };
}

const chartConfig = {
  independent: {
    label: "Independent",
    color: "hsl(180, 70%, 50%)",
  },
  catholic: {
    label: "Catholic",
    color: "hsl(180, 70%, 40%)",
  },
  government: {
    label: "Government",
    color: "hsl(180, 70%, 30%)",
  },
} satisfies ChartConfig;

export function LessonsWeeklyChart({
  lessonsWeeklyChart,
}: LessonsWeeklyChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{lessonsWeeklyChart.title}</CardTitle>
        <CardDescription>Lesson deliveries across school types</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={lessonsWeeklyChart.data}
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
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar
              dataKey="government"
              fill="var(--color-government)"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="catholic"
              fill="var(--color-catholic)"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="independent"
              fill="var(--color-independent)"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              Weekly lesson delivery trends <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              Showing independent, catholic, and government schools
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
