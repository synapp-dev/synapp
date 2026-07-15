"use client";

import * as React from "react";
import Link from "next/link";
import CountUp from "react-countup";
import { BarChart3, ExternalLink } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import type { SalesMixRow } from "@/entities/sales-insights/model/types";

/**
 * Bar + count-up share one ease-in-out curve (same approach as intradark's
 * `AnimatedStat`): quick acceleration, long soft landing. The CSS transition
 * and react-countup both read these control points so they stay in lockstep.
 */
const EASE_CONTROL_POINTS = [0.42, 0, 0.17, 1] as const;
const EASE_IN_OUT = `cubic-bezier(${EASE_CONTROL_POINTS.join(", ")})`;

const BAR_DURATION_S = 1.4;
const ROW_STAGGER_S = 0.12;
/** Rows past this index animate together — they start below the fold anyway. */
const MAX_STAGGERED_ROWS = 12;

/** Evaluate a cubic-bezier easing y for a normalized progress x in [0, 1]. */
function makeBezierEase(p1x: number, p1y: number, p2x: number, p2y: number) {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDerivX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const xEst = sampleX(t) - x;
      if (Math.abs(xEst) < 1e-5) return sampleY(t);
      const deriv = sampleDerivX(t);
      if (Math.abs(deriv) < 1e-6) break;
      t -= xEst / deriv;
    }
    return sampleY(Math.min(1, Math.max(0, t)));
  };
}

const bezierEase = makeBezierEase(...EASE_CONTROL_POINTS);

/** react-countup easing signature: matches the bar's cubic-bezier curve. */
function easeInOut(t: number, b: number, c: number, d: number): number {
  return b + c * bezierEase(d === 0 ? 1 : t / d);
}

function mixLineDetailKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function mixRowSecondaryText(row: SalesMixRow): string | null {
  const variation = row.squareVariationName?.trim();
  if (variation) {
    return variation;
  }
  const receiptDiffers =
    !row.mapped &&
    row.squareLineName &&
    mixLineDetailKey(row.squareLineName) !== mixLineDetailKey(row.label);
  if (receiptDiffers) {
    return `Receipt line: ${row.squareLineName}`;
  }
  return null;
}

type AnimatedMixRowProps = {
  row: SalesMixRow;
  /** Bar sweep target as % of the top seller's revenue. */
  sharePercent: number;
  delaySeconds: number;
  onSelect?: (row: SalesMixRow) => void;
};

function AnimatedMixRow({
  row,
  sharePercent,
  delaySeconds,
  onSelect,
}: AnimatedMixRowProps) {
  const [progress, setProgress] = React.useState(0);
  const target = Math.max(sharePercent, 1.5);
  const secondary = mixRowSecondaryText(row);

  // Hold the bar at 0, then (after the stagger delay) flip to the target so the
  // browser tweens the whole sweep with the shared ease curve.
  React.useEffect(() => {
    setProgress(0);
    let raf1 = 0;
    let raf2 = 0;
    const timeoutId = setTimeout(() => {
      // Two rAFs so the 0 state paints before the transition to target begins.
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setProgress(target));
      });
    }, delaySeconds * 1000);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [target, delaySeconds]);

  return (
    <li
      className={cn(
        "animate-slide-down-fade-in-slowest py-3",
        onSelect &&
          "-mx-2 cursor-pointer rounded-md px-2 transition-colors hover:bg-muted/60",
      )}
      style={{ animationDelay: `${delaySeconds}s` }}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? () => onSelect(row) : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(row);
              }
            }
          : undefined
      }
    >
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium leading-snug">
            {row.label}
          </p>
          {!row.mapped ? (
            <Badge
              variant="outline"
              className="shrink-0 px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
            >
              Unmapped
            </Badge>
          ) : null}
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums leading-snug">
          <CountUp
            start={0}
            end={row.revenueCents / 100}
            duration={BAR_DURATION_S}
            delay={delaySeconds}
            useEasing
            easingFn={easeInOut}
            decimals={2}
            prefix="$"
            separator=","
          />
        </span>
      </div>
      <Progress
        value={progress}
        max={100}
        className="mt-2 h-1.5 bg-muted"
        indicatorStyle={{
          backgroundColor: "var(--brand-supersolt-primary)",
          transition: `transform ${BAR_DURATION_S}s ${EASE_IN_OUT}`,
        }}
      />
      <div className="mt-1 flex items-baseline justify-between gap-4 text-[11px] text-muted-foreground">
        <span className="min-w-0 truncate">{secondary ?? ""}</span>
        <span className="shrink-0 tabular-nums">
          {row.quantity.toLocaleString("en-AU", {
            maximumFractionDigits: 2,
          })}{" "}
          sold
        </span>
      </div>
    </li>
  );
}

/** Descending widths so the skeleton reads as a ranked, top-sellers-first list. */
const MIX_SKELETON_ROW_WIDTHS = [88, 74, 62, 52, 44, 36];

export type SalesMixCardProps = {
  rows: SalesMixRow[];
  dataSource: "square" | "demo";
  integrationHref: string;
  /** Match the transactions card so the two half-width columns line up. */
  scrollAreaClassName?: string;
  /** When set, rows become clickable (opens the item analytics sheet). */
  onRowSelect?: (row: SalesMixRow) => void;
  /** Show placeholder rows while the period's line items load. */
  isLoading?: boolean;
};

export function SalesMixCard({
  rows,
  dataSource,
  integrationHref,
  scrollAreaClassName = "max-h-[520px]",
  onRowSelect,
  isLoading,
}: SalesMixCardProps) {
  const sorted = React.useMemo(
    () => [...rows].sort((a, b) => b.revenueCents - a.revenueCents),
    [rows],
  );
  const maxRevenue = sorted[0]?.revenueCents ?? 0;
  const hasUnmapped = sorted.some((row) => !row.mapped);

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b px-5 py-4 [.border-b]:pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base">Sales mix</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            {sorted.length > 0
              ? `${sorted.length} item${sorted.length === 1 ? "" : "s"} sold in the selected period, top sellers first.`
              : "Top sellers for the selected period."}
          </CardDescription>
        </div>
        {hasUnmapped ? (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1.5 text-xs"
          >
            <Link href={integrationHref}>
              Map items
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="px-0 py-0">
        {isLoading ? (
          <div className={cn("overflow-hidden px-5 py-1", scrollAreaClassName)}>
            <ul className="divide-y">
              {MIX_SKELETON_ROW_WIDTHS.map((width, index) => (
                <li
                  key={index}
                  className="animate-slide-down-fade-in-slow py-3"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                  <Skeleton
                    className="mt-2 h-1.5 rounded-full"
                    style={{ width: `${width}%` }}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : sorted.length > 0 ? (
          <div className={cn("overflow-y-auto px-5 py-1", scrollAreaClassName)}>
            <ul className="divide-y">
              {sorted.map((row, index) => (
                <AnimatedMixRow
                  key={row.mixKey}
                  row={row}
                  sharePercent={
                    maxRevenue > 0 ? (row.revenueCents / maxRevenue) * 100 : 0
                  }
                  delaySeconds={
                    Math.min(index, MAX_STAGGERED_ROWS) * ROW_STAGGER_S
                  }
                  onSelect={onRowSelect}
                />
              ))}
            </ul>
          </div>
        ) : (
          <div className="m-5 rounded-xl border border-dashed p-6 text-center">
            <BarChart3 className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            {dataSource === "square" ? (
              <>
                <p className="text-sm font-medium">
                  No line-level sales in this range
                </p>
                <p className="mx-auto mt-1 mb-3 max-w-md text-xs text-muted-foreground">
                  Payments need a Square <code className="text-xs">order_id</code>{" "}
                  so we can load line items. Map catalog ids to your menu in
                  settings for labelled mix.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">
                  Demo mix appears when line items exist
                </p>
                <p className="mx-auto mt-1 mb-3 max-w-md text-xs text-muted-foreground">
                  Connect Square to load real order lines; use venue settings to
                  map Square catalog ids to your menu.
                </p>
              </>
            )}
            <Link
              href={integrationHref}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open settings
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
