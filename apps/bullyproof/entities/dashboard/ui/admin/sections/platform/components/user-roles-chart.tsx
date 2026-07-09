"use client";

import { PieChart, Pie, Cell } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";

interface UserRolesChartProps {
  userRolesChart: {
    title: string;
    data: Array<{
      role: string;
      value: number;
      color: string;
    }>;
  };
}

const chartConfig = {
  Teachers: {
    label: "Teachers",
    color: "hsl(180, 70%, 50%)",
  },
  Admins: {
    label: "Admins",
    color: "hsl(180, 70%, 40%)",
  },
  Government: {
    label: "Government",
    color: "hsl(180, 70%, 30%)",
  },
  Students: {
    label: "Students",
    color: "hsl(180, 70%, 60%)",
  },
} satisfies ChartConfig;

export function UserRolesChart({ userRolesChart }: UserRolesChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{userRolesChart.title}</CardTitle>
        <CardDescription>
          Distribution of user roles across the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent nameKey="role" />}
            />
            <Pie
              data={userRolesChart.data}
              dataKey="value"
              nameKey="role"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={2}
            >
              {userRolesChart.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {userRolesChart.data.map((item, _index) => (
            <div key={item.role} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-muted-foreground">
                {item.role}: {item.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
