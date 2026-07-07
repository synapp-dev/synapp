"use client";

import { format, parseISO } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";
import type { DayScore } from "@/lib/scoring/compute";
import { scoreBand } from "@/lib/scoring/bands";

const BAND_CLASS = {
  high: "bg-emerald-500",
  mid: "bg-amber-500",
  low: "bg-rose-500",
} as const;

function bandClass(score: number): string {
  return BAND_CLASS[scoreBand(score)];
}

/** Mon-Sun mini bars for the selected week, tinted by score band. */
export function WeekDayBars({
  days,
  today,
}: {
  days: DayScore[];
  today: string;
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {days.map((day) => {
        const date = parseISO(day.date);
        const isToday = day.date === today;
        const isFuture = day.date > today;
        const scored = day.score !== null;
        const title = scored
          ? `${format(date, "EEE d MMM")}: ${day.score}/100`
          : `${format(date, "EEE d MMM")}: ${isFuture ? "not yet" : "no activity"}`;

        return (
          <div
            key={day.date}
            className="flex min-w-0 flex-col items-center gap-1.5"
            title={title}
          >
            <div
              className={cn(
                "flex h-24 w-full items-end rounded-md bg-muted/50 p-1",
                isToday && "ring-1 ring-ring/40",
                isFuture && "opacity-40"
              )}
            >
              {scored ? (
                <div
                  className={cn(
                    "w-full rounded-sm transition-[height] duration-700",
                    bandClass(day.score!)
                  )}
                  style={{ height: `${Math.max(day.score!, 6)}%` }}
                />
              ) : null}
            </div>
            <span className="text-[11px] font-medium tabular-nums leading-none">
              {scored ? day.score : "·"}
            </span>
            <span
              className={cn(
                "text-[10px] uppercase tracking-wide leading-none",
                isToday
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {format(date, "EEEEE")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
