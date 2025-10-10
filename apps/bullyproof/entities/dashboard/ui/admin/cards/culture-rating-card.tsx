"use client";

import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { PolarGrid, RadialBar, RadialBarChart } from "recharts";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Progress } from "@workspace/ui/components/progress";

interface CultureRatingCardProps {
  title: string;
  schools: Array<{
    id: string;
    name: string;
    data: Array<{
      metric: string;
      value: {
        amount: number;
        type: "number" | "percentage";
      };
      previousValue: {
        amount: number;
        type: "number" | "percentage";
      };
      label: string;
    }>;
  }>;
}

const chartConfig = {
  attendance: {
    label: "Attendance Rating",
    color: "hsl(180, 70%, 25%)", // Darker teal (top)
  },
  lessons: {
    label: "Completed Lessons",
    color: "hsl(180, 70%, 32%)", // Dark teal
  },
  engagement: {
    label: "Engagement Rating",
    color: "hsl(180, 70%, 40%)", // Middle teal
  },
  incidents: {
    label: "Incident Rating",
    color: "hsl(180, 70%, 48%)", // Light teal
  },
  wellbeing: {
    label: "Wellbeing Score",
    color: "hsl(180, 70%, 55%)", // Lighter teal
  },
  satisfaction: {
    label: "Teacher Satisfaction",
    color: "hsl(180, 70%, 62%)", // Lightest teal (bottom)
  },
} satisfies ChartConfig;

export function CultureRatingCard({ title, schools }: CultureRatingCardProps) {
  const [selectedSchoolId, setSelectedSchoolId] = useState(
    schools[0]?.id || ""
  );
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>(
    {}
  );

  const selectedSchool = schools.find(
    (school) => school.id === selectedSchoolId
  );

  // Animate progress bar values when school changes
  useEffect(() => {
    if (!selectedSchool) return;

    const targetValues: Record<string, number> = {};
    selectedSchool.data.forEach((item) => {
      targetValues[item.metric] = item.value.amount;
    });

    // Start animation from 0 or current values
    const startValues: Record<string, number> = {};
    selectedSchool.data.forEach((item) => {
      startValues[item.metric] = animatedValues[item.metric] || 0;
    });

    setAnimatedValues(startValues);

    // Animate to target values with smoother animation
    const duration = 1000; // Slightly longer duration for smoother feel
    const targetFPS = 60; // Target 60 FPS for smooth animation
    const stepDuration = 1000 / targetFPS; // ~16.67ms per frame
    const totalSteps = Math.ceil(duration / stepDuration);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = Math.min(step / totalSteps, 1);

      // Use a smoother easing function (ease-out-quart)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      const newValues: Record<string, number> = {};
      selectedSchool.data.forEach((item) => {
        const start = startValues[item.metric] || 0;
        const target = targetValues[item.metric] || 0;
        newValues[item.metric] = Math.round(
          start + (target - start) * easeOutQuart
        );
      });

      setAnimatedValues(newValues);

      if (step >= totalSteps) {
        clearInterval(interval);
        setAnimatedValues(targetValues);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [selectedSchoolId, selectedSchool]);

  const chartData =
    selectedSchool?.data.map((item) => ({
      metric: item.metric,
      value: animatedValues[item.metric] || 0,
      fill: `var(--color-${item.metric})`,
    })) || [];

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0 flex flex-row justify-between min-h-fit w-full">
        <CardTitle className="flex items-center justify-between w-full">
          <h2 className="text-lg font-medium text-muted-foreground w-1/2">
            {title}
          </h2>
          <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
            <SelectTrigger className="w-2/5">
              <SelectValue placeholder="Select school" />
            </SelectTrigger>
            <SelectContent>
              {schools.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex gap-4 min-h-fit">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-full max-w-2/5 w-full flex"
        >
          <RadialBarChart data={chartData} innerRadius={25} outerRadius={100}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent nameKey="metric" />}
            />
            <PolarGrid gridType="circle" />
            <RadialBar dataKey="value" />
          </RadialBarChart>
        </ChartContainer>
        <div className="max-w-3/5 w-full space-y-4">
          {selectedSchool?.data
            .slice()
            .reverse()
            .map((item) => {
              const config =
                chartConfig[item.metric as keyof typeof chartConfig];
              const animatedValue = animatedValues[item.metric] || 0;
              return (
                <div key={item.metric} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {config?.label || item.label}
                    </p>
                    <p className="text-sm font-semibold transition-all duration-200 ease-out">
                      {animatedValue}
                    </p>
                  </div>
                  <Progress
                    value={animatedValue}
                    className="h-2 transition-all duration-200 ease-out"
                    indicatorStyle={{
                      backgroundColor: config?.color || "var(--chart-1)",
                      transition: "width 0.2s ease-out",
                    }}
                  />
                </div>
              );
            })}
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm w-full items-start max-h-fit">
        <div className="flex items-center justify-start gap-2 leading-none font-medium">
          {(() => {
            if (!selectedSchool?.data) return "No data available";

            // Calculate overall trend by averaging all metrics using animated values
            const totalCurrent = selectedSchool.data.reduce(
              (sum, item) => sum + (animatedValues[item.metric] || 0),
              0
            );
            const totalPrevious = selectedSchool.data.reduce(
              (sum, item) => sum + item.previousValue.amount,
              0
            );
            const overallTrend =
              ((totalCurrent - totalPrevious) / totalPrevious) * 100;
            const trendDirection = overallTrend > 0 ? "up" : "down";

            return `Culture ratings ${trendDirection === "up" ? "improving" : "declining"} ${Math.abs(overallTrend).toFixed(1)}%`;
          })()}{" "}
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Showing metrics for {selectedSchool?.name}
        </div>
      </CardFooter>
    </Card>
  );
}
