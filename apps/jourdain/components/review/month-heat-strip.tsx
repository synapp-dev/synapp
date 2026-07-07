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

/** One cell per day of the month, tinted by score band; future days dimmed. */
export function MonthHeatStrip({
  days,
  today,
}: {
  days: DayScore[];
  today: string;
}) {
  return (
    <div className="flex gap-0.5 sm:gap-1">
      {days.map((day) => {
        const dayNumber = Number(day.date.slice(8));
        const isToday = day.date === today;
        const isFuture = day.date > today;
        const scored = day.score !== null;
        const title = scored
          ? `${format(parseISO(day.date), "EEE d MMM")}: ${day.score}/100`
          : `${format(parseISO(day.date), "EEE d MMM")}: ${isFuture ? "not yet" : "no activity"}`;

        return (
          <div
            key={day.date}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
            title={title}
          >
            <div
              className={cn(
                "h-7 w-full rounded-sm",
                scored ? BAND_CLASS[scoreBand(day.score!)] : "bg-muted/60",
                isFuture && "opacity-30",
                isToday && "ring-1 ring-ring/60"
              )}
            />
            <span
              className={cn(
                "text-[9px] leading-none tabular-nums",
                isToday
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground",
                dayNumber !== 1 && dayNumber % 5 !== 0 && !isToday && "invisible"
              )}
            >
              {dayNumber}
            </span>
          </div>
        );
      })}
    </div>
  );
}
