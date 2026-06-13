"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import type { ForecastDelta } from "@/entities/sales-insights/lib/sales-forecast-ui";
import { formatDeltaPercent } from "@/entities/sales-insights/lib/sales-forecast-ui";

export type SalesKpiMetricCardProps = {
  label: string;
  value: string;
  size?: "lg" | "md";
  delta?: ForecastDelta | null;
  confidenceLabel?: string | null;
  forecastHint?: string | null;
};

export function SalesKpiMetricCard({
  label,
  value,
  size = "lg",
  delta,
  confidenceLabel: confidence,
  forecastHint,
}: SalesKpiMetricCardProps) {
  const DeltaIcon =
    delta?.direction === "up"
      ? ArrowUp
      : delta?.direction === "down"
        ? ArrowDown
        : Minus;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardDescription className="text-xs uppercase tracking-wider">
            {label}
          </CardDescription>
          {confidence ? (
            <Badge variant="outline" className="text-[10px] font-normal">
              {confidence} confidence
            </Badge>
          ) : null}
        </div>
        <CardTitle
          className={cn(
            "tabular-nums",
            size === "lg" ? "text-3xl" : "text-xl"
          )}
        >
          {value}
        </CardTitle>
        {delta ? (
          <p
            className={cn(
              "flex items-center gap-1 text-xs font-medium tabular-nums",
              delta.direction === "up" && "text-emerald-600 dark:text-emerald-400",
              delta.direction === "down" && "text-amber-700 dark:text-amber-400",
              delta.direction === "flat" && "text-muted-foreground"
            )}
          >
            <DeltaIcon className="h-3 w-3 shrink-0" />
            {formatDeltaPercent(delta)}
          </p>
        ) : forecastHint ? (
          <p className="text-muted-foreground text-xs">{forecastHint}</p>
        ) : null}
      </CardHeader>
    </Card>
  );
}
