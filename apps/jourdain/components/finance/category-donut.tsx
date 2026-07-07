"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { formatMoney } from "@/lib/format";
import type { CategoryTotal } from "@/lib/finance/stats";
import { CATEGORY_META } from "@/components/finance/category-meta";

export function CategoryDonut({
  breakdown,
  total,
  className,
}: {
  breakdown: CategoryTotal[];
  total: number;
  className?: string;
}) {
  const data = breakdown.map((entry) => ({
    name: CATEGORY_META[entry.category].label,
    category: entry.category,
    value: entry.total,
    fill: CATEGORY_META[entry.category].color,
  }));

  const config = Object.fromEntries(
    breakdown.map((entry) => [
      CATEGORY_META[entry.category].label,
      {
        label: CATEGORY_META[entry.category].label,
        color: CATEGORY_META[entry.category].color,
      },
    ])
  ) satisfies ChartConfig;

  return (
    <div className={className}>
      <div className="relative mx-auto aspect-square w-full max-w-56">
        <ChartContainer config={config} className="h-full w-full">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name) => (
                    <span className="flex w-full items-center justify-between gap-3">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="font-mono font-medium tabular-nums">
                        {formatMoney(Number(value))}
                      </span>
                    </span>
                  )}
                />
              }
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              strokeWidth={0}
              isAnimationActive
            >
              {data.map((entry) => (
                <Cell key={entry.category} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Spent</span>
          <span className="text-lg font-semibold tabular-nums">
            {formatMoney(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
