"use client";

import * as React from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
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
import { formatCurrency } from "@/entities/sales-insights/lib/sales-format";
import type { SalesFulfillmentPayload } from "@/entities/sales-insights/model/intelligence-types";

type SalesFulfillmentCardProps = {
  fulfillment: SalesFulfillmentPayload | null;
};

const chartConfig = {
  dineIn: { label: "Dine-in", color: "var(--color-emerald-500)" },
  pickUp: { label: "Pick-up", color: "var(--color-sky-500)" },
  delivery: { label: "Delivery", color: "var(--color-amber-500)" },
} satisfies ChartConfig;

function shortDate(isoDate: string): string {
  const [y = 0, mo = 1, d = 1] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, mo - 1, d, 12)));
}

/**
 * How revenue splits across dine-in, pick-up and delivery per day. The split
 * lives in daily_sales already; this is the first surface that shows it.
 */
export function SalesFulfillmentCard({
  fulfillment,
}: SalesFulfillmentCardProps) {
  const points = React.useMemo(
    () =>
      (fulfillment?.days ?? []).map((day) => ({
        date: day.date,
        label: shortDate(day.date),
        dineIn: day.dineInCents / 100,
        pickUp: day.pickUpCents / 100,
        delivery: day.deliveryCents / 100,
      })),
    [fulfillment],
  );

  if (!fulfillment || points.length === 0) {
    return null;
  }

  const total =
    fulfillment.totalDineInCents +
    fulfillment.totalPickUpCents +
    fulfillment.totalDeliveryCents;
  const share = (cents: number) =>
    total > 0 ? `${Math.round((cents / total) * 100)}%` : "0%";

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b px-5 py-4 [.border-b]:pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base">Where orders come from</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Daily revenue split by fulfilment. Watch rain push dine-in toward
            pick-up.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          {(
            [
              ["dineIn", fulfillment.totalDineInCents],
              ["pickUp", fulfillment.totalPickUpCents],
              ["delivery", fulfillment.totalDeliveryCents],
            ] as const
          ).map(([key, cents]) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: chartConfig[key].color }}
              />
              {chartConfig[key].label}{" "}
              <span className="text-muted-foreground tabular-nums">
                {formatCurrency(cents)} · {share(cents)}
              </span>
            </span>
          ))}
        </div>
      </CardHeader>

      <CardContent className="px-3 py-4">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[220px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={points}
            margin={{ left: 4, right: 4, top: 4, bottom: 0 }}
          >
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={44}
              tickFormatter={(value: number) => `$${value.toLocaleString("en-AU")}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => (
                    <>
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {chartConfig[name as keyof typeof chartConfig]?.label}
                      <span className="ml-auto font-mono tabular-nums">
                        ${Number(value).toLocaleString("en-AU", { maximumFractionDigits: 0 })}
                      </span>
                    </>
                  )}
                />
              }
            />
            <Bar
              dataKey="dineIn"
              stackId="fulfilment"
              fill="var(--color-emerald-500)"
              isAnimationActive={false}
            />
            <Bar
              dataKey="pickUp"
              stackId="fulfilment"
              fill="var(--color-sky-500)"
              isAnimationActive={false}
            />
            <Bar
              dataKey="delivery"
              stackId="fulfilment"
              fill="var(--color-amber-500)"
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
