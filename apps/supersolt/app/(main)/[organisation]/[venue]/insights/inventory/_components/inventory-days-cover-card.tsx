"use client";

import Link from "next/link";
import { Gauge, PartyPopper } from "lucide-react";
import { Bar, BarChart, Cell, ReferenceLine, XAxis, YAxis } from "recharts";
import { Button } from "@workspace/ui/components/button";
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
import type { DashboardStockRiskItem } from "@/server/dashboard/dashboard-digest.service";

const chartConfig = {
  daysOfCover: {
    label: "Days of cover",
    color: "rgb(245 158 11)", // amber-500
  },
} satisfies ChartConfig;

const CRITICAL_DAYS = 1.5;
const RISK_THRESHOLD_DAYS = 3;

function barFill(days: number): string {
  return days < CRITICAL_DAYS ? "rgb(244 63 94)" : "rgb(245 158 11)"; // rose-500 / amber-500
}

export type InventoryDaysCoverCardProps = {
  atRisk: DashboardStockRiskItem[];
  /** null = no approved stock count anchoring stock-on-hand yet. */
  trackedIngredients: number | null;
  stockCountsHref: string;
  isLoading?: boolean;
};

export function InventoryDaysCoverCard({
  atRisk,
  trackedIngredients,
  stockCountsHref,
  isLoading,
}: InventoryDaysCoverCardProps) {
  const data = atRisk.map((item) => ({
    name: item.name,
    daysOfCover: Number(item.daysOfCover.toFixed(1)),
  }));

  return (
    <Card className="flex h-full flex-col shadow-sm transition-shadow duration-300 hover:shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Gauge className="size-3.5" aria-hidden />
          </span>
          Days of cover
        </CardTitle>
        <CardDescription>
          Ingredients under {RISK_THRESHOLD_DAYS} days at current burn rates
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-0">
        {isLoading ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center py-10 text-xs">
            Computing burn rates…
          </div>
        ) : trackedIngredients === null ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
            <p className="text-sm font-medium">No stock anchor yet</p>
            <p className="text-muted-foreground max-w-[26ch] text-xs leading-relaxed">
              Approve a baseline stock count and days-of-cover tracking lights
              up here.
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link href={stockCountsHref}>Start a stock count</Link>
            </Button>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <PartyPopper
              className="size-6 text-emerald-500"
              aria-hidden
            />
            <p className="text-sm font-medium">Everything is covered</p>
            <p className="text-muted-foreground max-w-[30ch] text-xs leading-relaxed">
              All {trackedIngredients} tracked ingredients hold{" "}
              {RISK_THRESHOLD_DAYS}+ days of stock.
            </p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto w-full flex-1"
            style={{ minHeight: Math.max(160, data.length * 44) }}
          >
            <BarChart
              accessibilityLayer
              data={data}
              layout="vertical"
              margin={{ left: 4, right: 24, top: 4, bottom: 4 }}
            >
              <XAxis
                type="number"
                domain={[0, RISK_THRESHOLD_DAYS]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, opacity: 0.6 }}
                tickFormatter={(v: number) => `${v}d`}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    formatter={(value, _name, item) => (
                      <>
                        <span
                          className="size-2 shrink-0 rounded-[2px]"
                          style={{
                            background: barFill(Number(value)),
                          }}
                        />
                        <span className="text-muted-foreground">
                          {item.payload?.name}
                        </span>
                        <span className="ml-auto font-medium tabular-nums">
                          {Number(value).toFixed(1)} days left
                        </span>
                      </>
                    )}
                  />
                }
              />
              <ReferenceLine
                x={RISK_THRESHOLD_DAYS}
                stroke="currentColor"
                strokeOpacity={0.25}
                strokeDasharray="4 4"
              />
              <Bar
                dataKey="daysOfCover"
                radius={[4, 4, 4, 4]}
                barSize={14}
                animationDuration={900}
                animationEasing="ease-out"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={barFill(entry.daysOfCover)} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
