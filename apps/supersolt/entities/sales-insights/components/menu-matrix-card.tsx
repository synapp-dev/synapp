"use client";

import * as React from "react";
import Link from "next/link";
import {
  CartesianGrid,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { ChartContainer, type ChartConfig } from "@workspace/ui/components/chart";
import { cn } from "@workspace/ui/lib/utils";
import { formatCurrency } from "@/entities/sales-insights/lib/sales-format";
import type {
  MenuMatrixItem,
  MenuMatrixPayload,
  MenuMatrixQuadrant,
} from "@/entities/sales-insights/model/intelligence-types";

type MenuMatrixCardProps = {
  matrix: MenuMatrixPayload | null;
  recipesHref: string;
  onItemSelect?: (item: MenuMatrixItem) => void;
};

const QUADRANT_META: Record<
  MenuMatrixQuadrant,
  { label: string; action: string; color: string; chipClass: string }
> = {
  star: {
    label: "Stars",
    action: "Popular and profitable. Protect and promote them.",
    color: "var(--color-emerald-500)",
    chipClass:
      "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
  },
  plowhorse: {
    label: "Plowhorses",
    action: "Popular but thin margin. Nudge price or trim cost.",
    color: "var(--color-sky-500)",
    chipClass: "border-sky-500/40 text-sky-700 dark:text-sky-300",
  },
  puzzle: {
    label: "Puzzles",
    action: "High margin, low volume. Give them better placement.",
    color: "var(--color-amber-500)",
    chipClass: "border-amber-500/40 text-amber-700 dark:text-amber-300",
  },
  dog: {
    label: "Dogs",
    action: "Low volume, low margin. Rework or retire.",
    color: "var(--color-rose-500)",
    chipClass: "border-rose-500/40 text-rose-700 dark:text-rose-300",
  },
};

const QUADRANT_ORDER: MenuMatrixQuadrant[] = [
  "star",
  "plowhorse",
  "puzzle",
  "dog",
];

const chartConfig = {
  items: { label: "Menu items" },
} satisfies ChartConfig;

type MatrixPoint = MenuMatrixItem & {
  /** Contribution in dollars for the y axis. */
  contributionDollars: number;
};

function MatrixTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: MatrixPoint }[];
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) {
    return null;
  }
  const meta = QUADRANT_META[point.quadrant];
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{point.label}</p>
      <p className="text-muted-foreground">{point.sectionName}</p>
      <div className="mt-1.5 space-y-0.5 tabular-nums">
        <p>{point.quantity.toLocaleString("en-AU")} sold · {formatCurrency(point.revenueCents)} revenue</p>
        <p>
          {formatCurrency(point.unitContributionCents)} margin per serve (
          {point.marginPercent}%)
        </p>
      </div>
      <Badge variant="outline" className={cn("mt-1.5 text-[10px]", meta.chipClass)}>
        {meta.label.replace(/s$/, "")}
      </Badge>
    </div>
  );
}

/**
 * Menu engineering matrix: every costed item plotted popularity x contribution
 * margin, Kasavana-Smith quadrants. The one view that says promote, re-price,
 * re-position or retire per item.
 */
export function MenuMatrixCard({
  matrix,
  recipesHref,
  onItemSelect,
}: MenuMatrixCardProps) {
  const points = React.useMemo(
    (): MatrixPoint[] =>
      (matrix?.items ?? []).map((item) => ({
        ...item,
        contributionDollars: item.unitContributionCents / 100,
      })),
    [matrix],
  );

  const byQuadrant = React.useMemo(() => {
    const map = new Map<MenuMatrixQuadrant, MatrixPoint[]>();
    for (const quadrant of QUADRANT_ORDER) {
      map.set(
        quadrant,
        points.filter((point) => point.quadrant === quadrant),
      );
    }
    return map;
  }, [points]);

  if (!matrix) {
    return null;
  }

  const hasChart = points.length >= 4;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b px-5 py-4 [.border-b]:pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base">Menu engineering</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Every costed item, plotted units sold against margin per serve.
            Quadrant cutoffs: 70% of average volume, sales-weighted average
            margin.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUADRANT_ORDER.map((quadrant) => {
            const meta = QUADRANT_META[quadrant];
            const count = byQuadrant.get(quadrant)?.length ?? 0;
            return (
              <Badge
                key={quadrant}
                variant="outline"
                className={cn("gap-1.5 text-[11px]", meta.chipClass)}
              >
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                {meta.label} · {count}
              </Badge>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="px-5 py-4">
        {hasChart ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[320px] w-full"
          >
            <ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis
                type="number"
                dataKey="quantity"
                name="Units sold"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                label={{
                  value: "Units sold",
                  position: "insideBottom",
                  offset: -4,
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="contributionDollars"
                name="Margin per serve"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={52}
                tickFormatter={(value: number) => `$${value.toFixed(0)}`}
                label={{
                  value: "Margin / serve",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 11,
                }}
              />
              <ReferenceLine
                x={matrix.popularityThresholdQty}
                strokeDasharray="4 4"
                className="stroke-muted-foreground/50"
              />
              <ReferenceLine
                y={matrix.avgContributionCents / 100}
                strokeDasharray="4 4"
                className="stroke-muted-foreground/50"
              />
              <RechartsTooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={<MatrixTooltip />}
              />
              {QUADRANT_ORDER.map((quadrant) => (
                <Scatter
                  key={quadrant}
                  name={QUADRANT_META[quadrant].label}
                  data={byQuadrant.get(quadrant) ?? []}
                  fill={QUADRANT_META[quadrant].color}
                  fillOpacity={0.85}
                  isAnimationActive={false}
                  onClick={(point) =>
                    onItemSelect?.(point as unknown as MatrixPoint)
                  }
                  className={onItemSelect ? "cursor-pointer" : undefined}
                />
              ))}
            </ScatterChart>
          </ChartContainer>
        ) : (
          <div className="flex h-40 items-center justify-center px-6 text-center text-xs text-muted-foreground">
            Not enough costed items sold in this period to plot the matrix.
            Map POS items to recipes to unlock it.
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUADRANT_ORDER.map((quadrant) => {
            const meta = QUADRANT_META[quadrant];
            const quadrantItems = byQuadrant.get(quadrant) ?? [];
            return (
              <div key={quadrant} className="rounded-lg border p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  {meta.label}
                </p>
                <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                  {meta.action}
                </p>
                {quadrantItems.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {quadrantItems.slice(0, 3).map((item) => (
                      <li key={item.menuItemId}>
                        <button
                          type="button"
                          className="w-full truncate text-left text-xs font-medium hover:underline"
                          onClick={() => onItemSelect?.(item)}
                        >
                          {item.label}
                          <span className="text-muted-foreground ml-1 font-normal tabular-nums">
                            {item.quantity} sold · {item.marginPercent}%
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground mt-2 text-[11px]">None</p>
                )}
              </div>
            );
          })}
        </div>

        {matrix.needsCostingCount > 0 ? (
          <p className="text-muted-foreground mt-3 text-[11px] leading-relaxed">
            {matrix.needsCostingCount} mapped item
            {matrix.needsCostingCount === 1 ? "" : "s"} (
            {formatCurrency(matrix.needsCostingRevenueCents)} of period revenue)
            sold without a recipe cost, so they sit outside the matrix.{" "}
            <Link
              href={recipesHref}
              className="text-primary font-medium underline underline-offset-2"
            >
              Add recipe costs
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
