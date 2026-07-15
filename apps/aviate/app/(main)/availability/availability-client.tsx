"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

import { PageHeader } from "@/components/molecules/page-header";
import {
  AVAILABILITY_ENTRIES,
  type AvailabilityState,
} from "@/lib/aviate-demo";

const NEXT_STATE: Record<AvailabilityState, AvailabilityState> = {
  available: "partial",
  partial: "unavailable",
  unavailable: "available",
};

const CELL_BG: Record<AvailabilityState, string> = {
  available: "",
  partial: "bg-amber-50 dark:bg-amber-500/10",
  unavailable: "bg-muted",
};

const LEGEND: { state: AvailabilityState; label: string; dot: string }[] = [
  { state: "available", label: "Available", dot: "border bg-background" },
  { state: "partial", label: "Partial Availability", dot: "bg-amber-400" },
  { state: "unavailable", label: "Unavailable", dot: "bg-muted-foreground/40" },
];

const WEEK_HEADER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type DayInfo = { state: AvailabilityState; label?: string };

export function AvailabilityClient() {
  // Anchor to the month shown in the design.
  const [month, setMonth] = React.useState(() => new Date(2026, 6, 1));

  const [days, setDays] = React.useState<Record<string, DayInfo>>(() => {
    const seed: Record<string, DayInfo> = {};
    for (const e of AVAILABILITY_ENTRIES) {
      seed[e.date] = { state: e.state, label: e.label };
    }
    return seed;
  });

  const gridDays = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const toggleDay = (key: string) => {
    setDays((prev) => {
      const current = prev[key]?.state ?? "available";
      const next = NEXT_STATE[current];
      const copy = { ...prev };
      if (next === "available") {
        delete copy[key];
      } else {
        copy[key] = { state: next, label: prev[key]?.label };
      }
      return copy;
    });
  };

  const upcoming = React.useMemo(
    () =>
      Object.entries(days)
        .filter(([, info]) => info.state !== "available")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, info]) => ({ date, ...info })),
    [days]
  );

  const monthLabel = format(month, "MMMM yyyy");

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title="My Availability Calendar"
        subtitle="Set and submit your upcoming scheduling availability preferences"
      />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1 text-sm">
        <span className="font-medium text-muted-foreground">
          Availability Status:
        </span>
        {LEGEND.map((l) => (
          <span key={l.state} className="inline-flex items-center gap-2">
            <span className={cn("size-3 rounded-sm", l.dot)} />
            {l.label}
          </span>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Calendar */}
        <Card className="gap-0 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{monthLabel}</h2>
            <div className="flex items-center gap-1.5">
              <IconButton
                label="Previous month"
                onClick={() => setMonth((m) => addMonths(m, -1))}
              >
                <ChevronLeft className="size-4" />
              </IconButton>
              <IconButton
                label="Next month"
                onClick={() => setMonth((m) => addMonths(m, 1))}
              >
                <ChevronRight className="size-4" />
              </IconButton>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b pb-2 text-center text-xs font-medium text-muted-foreground">
            {WEEK_HEADER.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {gridDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const info = days[key];
              const state = info?.state ?? "available";
              const inMonth = isSameMonth(day, month);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleDay(key)}
                  className={cn(
                    "relative min-h-[84px] border-b border-r p-1.5 text-left align-top transition-colors first:border-l",
                    "[&:nth-child(7n+1)]:border-l hover:ring-1 hover:ring-inset hover:ring-primary/30",
                    inMonth ? CELL_BG[state] : "bg-muted/30",
                    !inMonth && "text-muted-foreground/40"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-medium",
                      inMonth ? "text-foreground" : "text-muted-foreground/40"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {inMonth && info?.label ? (
                    <span className="mt-1 block truncate text-[10px] leading-tight text-muted-foreground">
                      {info.label}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Tip: click a day to cycle Available → Partial → Unavailable.
          </p>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          <Button
            className="h-11 w-full bg-orange-500 text-base text-white hover:bg-orange-600"
            onClick={() =>
              toast.success(
                `Availability for ${format(month, "MMMM")} submitted (${
                  upcoming.length
                } off-availability ${
                  upcoming.length === 1 ? "entry" : "entries"
                })`
              )
            }
          >
            Submit Availability for {format(month, "MMMM")}
          </Button>

          <Card className="p-5">
            <h2 className="text-base font-semibold">Upcoming Off-Availability</h2>
            <div className="mt-3 space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Fully available this month.
                </p>
              ) : (
                upcoming.map((u) => (
                  <div
                    key={u.date}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {format(new Date(`${u.date}T00:00:00`), "EEEE, d MMM yyyy")}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {u.label ??
                          (u.state === "partial"
                            ? "Partial availability"
                            : "Marked unavailable")}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-orange-600 dark:text-orange-400">
                      {u.state === "partial" ? "Partial" : "All Day"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}
