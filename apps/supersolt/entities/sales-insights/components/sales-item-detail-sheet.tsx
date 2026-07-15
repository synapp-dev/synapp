"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { cn } from "@workspace/ui/lib/utils";
import {
  channelLabel,
  formatCurrency,
} from "@/entities/sales-insights/lib/sales-format";
import { computeSalesItemAnalytics } from "@/entities/sales-insights/lib/sales-item-analytics";
import type {
  SalesMixRow,
  SalesOrderRow,
} from "@/entities/sales-insights/model/types";

const quantityChartConfig = {
  quantity: {
    label: "Sold",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const COMPANION_LIMIT = 8;
const MODIFIER_LIMIT = 8;

function formatQuantity(value: number): string {
  return value.toLocaleString("en-AU", { maximumFractionDigits: 2 });
}

function HeroChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-emerald-50">
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | null;
}) {
  return (
    <div className="min-w-0 rounded-xl border bg-muted/30 px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold leading-tight tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function QuantityBarChart({
  data,
  xKey,
  height = 140,
  tooltipRevenueKey,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  height?: number;
  /** When set, the tooltip appends this row's revenue below the quantity. */
  tooltipRevenueKey?: string;
}) {
  return (
    <ChartContainer
      config={quantityChartConfig}
      className={cn(
        "aspect-auto w-full [&_.recharts-responsive-container]:!h-full",
      )}
      style={{ height }}
    >
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          tickMargin={8}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={12}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="dashed"
              formatter={(value, _name, entry) => {
                const revenue =
                  tooltipRevenueKey !== undefined
                    ? entry?.payload?.[tooltipRevenueKey]
                    : undefined;
                return (
                  <div className="flex w-full items-baseline justify-between gap-3">
                    <span>{formatQuantity(Number(value))} sold</span>
                    {typeof revenue === "number" ? (
                      <span className="tabular-nums text-muted-foreground">
                        {formatCurrency(revenue)}
                      </span>
                    ) : null}
                  </div>
                );
              }}
            />
          }
        />
        <Bar dataKey="quantity" fill="var(--color-quantity)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

export type SalesItemDetailSheetProps = {
  item: SalesMixRow | null;
  orders: SalesOrderRow[];
  timezone: string;
  onOpenChange: (open: boolean) => void;
};

export function SalesItemDetailSheet({
  item,
  orders,
  timezone,
  onOpenChange,
}: SalesItemDetailSheetProps) {
  const analytics = React.useMemo(() => {
    if (!item) return null;
    return computeSalesItemAnalytics({ orders, mixRow: item, timezone });
  }, [item, orders, timezone]);

  const companions = analytics?.companions.slice(0, COMPANION_LIMIT) ?? [];
  const maxCompanionOrders = companions[0]?.ordersTogether ?? 0;
  const showDaily = (analytics?.daily.length ?? 0) > 1;
  const avgCheckDeltaCents =
    analytics?.avgCheckWithItemCents != null &&
    analytics.avgCheckWithoutItemCents != null
      ? analytics.avgCheckWithItemCents - analytics.avgCheckWithoutItemCents
      : null;

  return (
    <Sheet open={item !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          // Fixed header + scrolling body: the sheet itself never scrolls, so
          // the scrollbar lives on the body and stops beneath the header.
          "mx-auto max-h-[88vh] w-full gap-0 overflow-hidden rounded-t-2xl border-x-0 border-t-0 p-0 sm:max-w-2xl sm:border-x",
          "[&>button]:top-5 [&>button]:right-5 [&>button]:text-emerald-100 [&>button]:opacity-80 hover:[&>button]:opacity-100",
        )}
      >
        {item && analytics ? (
          <>
            {/* Fixed sheet header: shrink-0 keeps flexbox from crushing it
                (overflow-hidden zeroes its automatic min-height); only the
                body below scrolls. */}
            <div className="relative shrink-0 overflow-hidden rounded-t-2xl bg-emerald-950 px-6 pb-5 pt-3 text-green-50">
              <div
                aria-hidden
                className="net-revenue-hero-shifting-blobs pointer-events-none absolute inset-0 z-0"
              />
              <div className="relative z-10">
                <div
                  aria-hidden
                  className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/25"
                />
                <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-200/90">
                  Sales mix · item stats
                </p>
                <SheetTitle className="mt-1 truncate pr-10 text-2xl font-semibold leading-tight tracking-tight text-white">
                  {item.label}
                </SheetTitle>
                <SheetDescription className="mt-0.5 text-xs text-emerald-200/70">
                  {item.squareVariationName?.trim()
                    ? `${item.squareVariationName} · `
                    : ""}
                  {formatQuantity(analytics.totalQuantity)} sold ·{" "}
                  {formatCurrency(analytics.totalRevenueCents)} in the selected
                  period
                  {!item.mapped ? " · unmapped POS line" : ""}
                </SheetDescription>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <HeroChip>
                    {formatCurrency(analytics.avgUnitPriceCents)} avg price
                  </HeroChip>
                  <HeroChip>
                    {analytics.revenueSharePercent.toLocaleString("en-AU", {
                      maximumFractionDigits: 1,
                    })}
                    % of item revenue
                  </HeroChip>
                  {analytics.peakDayLabel ? (
                    <HeroChip>Peak day {analytics.peakDayLabel}</HeroChip>
                  ) : null}
                  {analytics.peakHourLabel ? (
                    <HeroChip>Busiest at {analytics.peakHourLabel}</HeroChip>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-6 px-6 py-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <StatTile
                    label="Appears in"
                    value={`${analytics.attachRatePercent.toLocaleString(
                      "en-AU",
                      { maximumFractionDigits: 1 },
                    )}% of orders`}
                    hint={`${analytics.orderCount.toLocaleString("en-AU")} of ${analytics.totalOrderCount.toLocaleString("en-AU")} orders`}
                  />
                  <StatTile
                    label="Avg per order"
                    value={formatQuantity(analytics.avgQuantityPerOrder)}
                    hint="when the item is ordered"
                  />
                  <StatTile
                    label="Avg check with item"
                    value={
                      analytics.avgCheckWithItemCents != null
                        ? formatCurrency(analytics.avgCheckWithItemCents)
                        : "—"
                    }
                    hint={
                      avgCheckDeltaCents != null
                        ? `${avgCheckDeltaCents >= 0 ? "+" : "-"}${formatCurrency(
                            Math.abs(avgCheckDeltaCents),
                          )} vs orders without it`
                        : null
                    }
                  />
                </div>

                {showDaily ? (
                  <div>
                    <SectionLabel>Sold per day</SectionLabel>
                    <QuantityBarChart
                      data={analytics.daily}
                      xKey="label"
                      tooltipRevenueKey="revenueCents"
                    />
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <SectionLabel>By day of week</SectionLabel>
                    <QuantityBarChart
                      data={analytics.byWeekday}
                      xKey="label"
                      height={120}
                      tooltipRevenueKey="revenueCents"
                    />
                  </div>
                  <div>
                    <SectionLabel>By time of day</SectionLabel>
                    <QuantityBarChart
                      data={analytics.byHour}
                      xKey="label"
                      height={120}
                    />
                  </div>
                </div>

                {companions.length > 0 ? (
                  <div>
                    <SectionLabel>Commonly ordered with</SectionLabel>
                    <ul className="divide-y rounded-xl border">
                      {companions.map((companion) => (
                        <li key={companion.mixKey} className="px-4 py-2.5">
                          <div className="flex items-baseline justify-between gap-4">
                            <p className="min-w-0 truncate text-sm font-medium leading-snug">
                              {companion.label}
                            </p>
                            <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              {companion.ordersTogether.toLocaleString("en-AU")}{" "}
                              order{companion.ordersTogether === 1 ? "" : "s"} ·{" "}
                              {companion.attachPercent.toLocaleString("en-AU", {
                                maximumFractionDigits: 0,
                              })}
                              %
                            </p>
                          </div>
                          <Progress
                            value={
                              maxCompanionOrders > 0
                                ? (companion.ordersTogether /
                                    maxCompanionOrders) *
                                  100
                                : 0
                            }
                            max={100}
                            className="mt-1.5 h-1 bg-muted"
                            indicatorStyle={{
                              backgroundColor: "var(--brand-supersolt-primary)",
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      % of the {analytics.orderCount.toLocaleString("en-AU")}{" "}
                      orders with {item.label} that also included each item.
                    </p>
                  </div>
                ) : null}

                {analytics.modifiers.length > 0 ? (
                  <div>
                    <SectionLabel>Popular modifiers</SectionLabel>
                    <ul className="divide-y rounded-xl border">
                      {analytics.modifiers
                        .slice(0, MODIFIER_LIMIT)
                        .map((modifier) => (
                          <li key={modifier.label} className="px-4 py-2.5">
                            <div className="flex items-baseline justify-between gap-4">
                              <p className="min-w-0 truncate text-sm font-medium leading-snug">
                                {modifier.label}
                              </p>
                              <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                {formatQuantity(modifier.timesUsed)}× ·{" "}
                                {modifier.usagePercent.toLocaleString("en-AU", {
                                  maximumFractionDigits: 0,
                                })}
                                % of units
                                {modifier.revenueCents > 0
                                  ? ` · +${formatCurrency(modifier.revenueCents)}`
                                  : ""}
                              </p>
                            </div>
                            <Progress
                              value={Math.min(modifier.usagePercent, 100)}
                              max={100}
                              className="mt-1.5 h-1 bg-muted"
                              indicatorStyle={{
                                backgroundColor:
                                  "var(--brand-supersolt-primary)",
                              }}
                            />
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}

                {analytics.variations.length > 1 ? (
                  <div>
                    <SectionLabel>Variations</SectionLabel>
                    <ul className="divide-y rounded-xl border">
                      {analytics.variations.map((variation) => (
                        <li
                          key={variation.label}
                          className="flex items-baseline justify-between gap-4 px-4 py-2.5"
                        >
                          <p className="min-w-0 truncate text-sm font-medium leading-snug">
                            {variation.label}
                          </p>
                          <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {formatQuantity(variation.quantity)} sold ·{" "}
                            {formatCurrency(variation.revenueCents)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {analytics.channels.length > 0 ? (
                  <div>
                    <SectionLabel>Channels</SectionLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {analytics.channels.map((channel) => (
                        <Badge
                          key={channel.channel}
                          variant="secondary"
                          className="gap-1.5 px-2.5 py-1 text-xs font-normal"
                        >
                          {channelLabel(channel.channel)}
                          <span className="tabular-nums text-muted-foreground">
                            {channel.percent.toLocaleString("en-AU", {
                              maximumFractionDigits: 0,
                            })}
                            %
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
