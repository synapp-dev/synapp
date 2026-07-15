"use client";

import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { Target } from "lucide-react";
import { formatCurrency } from "@/entities/sales-insights/lib/sales-format";
import type {
  ForecastAccuracySummary,
  ForecastDriverChip,
} from "@/entities/sales-insights/lib/sales-forecast-ui";

const MISSES_SHOWN = 3;

const DRIVER_TONE_CLASS: Record<ForecastDriverChip["tone"], string> = {
  up: "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300",
  down: "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300",
  neutral: "text-muted-foreground",
};

function StatBlock({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      <p className="text-muted-foreground text-xs leading-relaxed">{hint}</p>
    </div>
  );
}

export type ForecastAccuracyCardProps = {
  summary: ForecastAccuracySummary;
};

/**
 * Scores the model against the selected period: each day compared with what
 * the engine would have predicted that morning (point-in-time backcast).
 */
export function ForecastAccuracyCard({ summary }: ForecastAccuracyCardProps) {
  const misses = summary.biggestMisses.slice(0, MISSES_SHOWN);

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="text-muted-foreground h-4 w-4" />
          Accuracy this period
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Every day is scored against the point-in-time forecast: what the
          model predicted that morning using only earlier history.
        </CardDescription>
      </CardHeader>

      {summary.comparedDays === 0 ? (
        <CardContent className="flex h-32 flex-col items-center justify-center gap-1.5 px-5 text-center">
          <p className="text-sm font-medium">Nothing to score yet</p>
          <p className="text-muted-foreground text-xs">
            Pick a period with synced sales history to see how the forecast
            performed.
          </p>
        </CardContent>
      ) : (
        <>
          <CardContent className="grid gap-5 border-b px-5 py-4 sm:grid-cols-3">
            <StatBlock
              label="Period accuracy"
              value={
                summary.overallAccuracyPct !== null
                  ? `${summary.overallAccuracyPct.toFixed(1)}%`
                  : "—"
              }
              hint={`Revenue-weighted across ${summary.comparedDays} day${summary.comparedDays === 1 ? "" : "s"}, so busy days count for more.`}
            />
            <StatBlock
              label="Typical day"
              value={
                summary.medianDailyAccuracyPct !== null
                  ? `${summary.medianDailyAccuracyPct.toFixed(1)}%`
                  : "—"
              }
              hint="Median daily accuracy: what an ordinary day looks like."
            />
            <StatBlock
              label="Within range"
              value={
                summary.withinBandPct !== null
                  ? `${Math.round(summary.withinBandPct)}%`
                  : "—"
              }
              hint="Days whose actual landed inside the forecast's confidence band."
            />
          </CardContent>

          {misses.length > 0 ? (
            <CardContent className="px-0 py-0">
              <p className="text-muted-foreground px-5 pt-3 pb-1 text-xs font-medium uppercase tracking-wider">
                Biggest surprises
              </p>
              <ul className="divide-y">
                {misses.map((day) => (
                  <li
                    key={day.date}
                    className="flex items-center gap-3 px-5 py-2.5"
                  >
                    <div className="w-24 shrink-0">
                      <p className="text-sm font-medium">{day.weekday}</p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {day.label}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs tabular-nums">
                        <span className="font-medium">
                          {formatCurrency(day.actualCents)}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          vs {formatCurrency(day.forecastCents)} forecast
                        </span>
                      </p>
                      {day.drivers.length > 0 ? (
                        <span className="mt-1 flex flex-wrap items-center gap-1">
                          {day.drivers.map((chip) => (
                            <Badge
                              key={chip.key}
                              variant="outline"
                              className={cn(
                                "px-1.5 py-0 text-[10px] font-normal",
                                DRIVER_TONE_CLASS[chip.tone],
                              )}
                            >
                              {chip.label}
                            </Badge>
                          ))}
                        </span>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-medium tabular-nums",
                        day.deltaPct > 0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-rose-700 dark:text-rose-400",
                      )}
                    >
                      {day.deltaPct > 0 ? "+" : ""}
                      {day.deltaPct.toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          ) : null}
        </>
      )}
    </Card>
  );
}
