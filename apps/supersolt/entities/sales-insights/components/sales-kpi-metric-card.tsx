"use client";

import { ChevronsDown, ChevronsUp, Minus } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import type { ForecastDelta } from "@/entities/sales-insights/lib/sales-forecast-ui";

export type SalesKpiMetricCardProps = {
  label: string;
  value: string;
  size?: "lg" | "md";
  delta?: ForecastDelta | null;
  confidenceLabel?: string | null;
  forecastHint?: string | null;
  /** Show a placeholder while the underlying period data loads. */
  isLoading?: boolean;
};

export function SalesKpiMetricCard({
  label,
  value,
  size = "lg",
  delta,
  confidenceLabel: confidence,
  forecastHint,
  isLoading,
}: SalesKpiMetricCardProps) {
  if (isLoading) {
    return (
      <Card className="gap-0 py-0">
        <CardContent className="flex h-full min-h-24 flex-col justify-between gap-3 px-5 py-4">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton
            className={cn(
              "rounded-md",
              size === "lg" ? "h-8 w-28 md:h-9" : "h-7 w-24 md:h-8",
            )}
          />
        </CardContent>
      </Card>
    );
  }

  const DeltaIcon =
    delta?.direction === "up"
      ? ChevronsUp
      : delta?.direction === "down"
        ? ChevronsDown
        : Minus;

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex h-full min-h-24 flex-col justify-between gap-3 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <CardDescription className="text-xs uppercase leading-none tracking-wider">
            {label}
          </CardDescription>
          {confidence ? (
            <Badge
              variant="outline"
              className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
            >
              {confidence} confidence
            </Badge>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-1">
          <CardTitle
            className={cn(
              "min-w-0 shrink leading-none tracking-tight tabular-nums",
              size === "lg" ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl",
            )}
          >
            {value}
          </CardTitle>
          {delta ? (
            <span
              title="Compared with the point-in-time forecast"
              className={cn(
                "inline-flex shrink-0 items-center gap-0 pb-0.5 text-xs font-medium tabular-nums [&>svg]:size-3.5",
                delta.direction === "up" &&
                  "text-emerald-700 dark:text-emerald-400",
                delta.direction === "down" &&
                  "text-rose-700 dark:text-rose-400",
                delta.direction === "flat" && "text-muted-foreground",
              )}
            >
              <DeltaIcon className="shrink-0" aria-hidden />
              <span>{Math.abs(delta.pct).toFixed(1)}%</span>
              <span className="sr-only">vs forecast</span>
            </span>
          ) : forecastHint ? (
            <span className="pb-0.5 text-xs text-muted-foreground">
              {forecastHint}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
