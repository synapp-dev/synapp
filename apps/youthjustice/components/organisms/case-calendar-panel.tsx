"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  addDays,
  addWeeks,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  startOfDay,
} from "date-fns";
import { enAU } from "date-fns/locale";
import ReactTimeago from "react-timeago";
import { makeIntlFormatter } from "react-timeago/defaultFormatter";
import type { Formatter } from "react-timeago";

import { Calendar } from "@workspace/ui/components/calendar";
import { Card } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";

const DEFAULT_START_HOUR = 9;

const calendarEventTimeagoFormatter = makeIntlFormatter({
  locale: "en-AU",
  style: "long",
  numeric: "always",
}) as Formatter;

const countdownFormatter: Formatter = (
  value,
  unit,
  suffix,
  epochMilliseconds,
  nextFormatter,
  now,
) => {
  if (suffix === "from now" && unit === "second" && value < 60) {
    const msUntil = epochMilliseconds - now();
    if (msUntil > 0 && msUntil < 60_000) {
      const secs = Math.max(1, Math.ceil(msUntil / 1000));
      return secs === 1 ? "in 1 second" : `in ${secs} seconds`;
    }
  }
  return calendarEventTimeagoFormatter(
    value,
    unit,
    suffix,
    epochMilliseconds,
    nextFormatter,
    now,
  );
};

export type CaseCalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: string;
  startsAt?: string;
};

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/** Start instant for the event; local wall time when `startsAt` is ISO without Z. */
function eventStartsAt(ev: CaseCalendarEvent): Date {
  if (ev.startsAt) {
    const d = new Date(ev.startsAt);
    if (!Number.isNaN(d.getTime())) {
      return d;
    }
  }
  const d = parseYmd(ev.date);
  d.setHours(DEFAULT_START_HOUR, 0, 0, 0);
  return d;
}

function eventYmd(ev: CaseCalendarEvent): string {
  return format(startOfDay(eventStartsAt(ev)), "yyyy-MM-dd");
}

function pickInitialDate(events: CaseCalendarEvent[]): Date {
  if (events.length === 0) {
    return new Date();
  }
  const now = new Date();
  const sorted = [...events].sort(
    (a, b) => eventStartsAt(a).getTime() - eventStartsAt(b).getTime(),
  );
  const next = sorted.find((e) => eventStartsAt(e) >= now);
  return next
    ? startOfDay(eventStartsAt(next))
    : startOfDay(eventStartsAt(sorted[0]!));
}

type BucketId = "today" | "tomorrow" | "restThisWeek" | "nextWeek" | "later";

const BUCKET_ORDER: BucketId[] = [
  "today",
  "tomorrow",
  "restThisWeek",
  "nextWeek",
  "later",
];

const BUCKET_LABELS: Record<BucketId, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  restThisWeek: "Rest of this week",
  nextWeek: "Next week",
  later: "Later",
};

function bucketForEventDay(eventDay: Date, todayStart: Date): BucketId {
  const ed = startOfDay(eventDay);
  const td = startOfDay(todayStart);
  if (isSameDay(ed, td)) {
    return "today";
  }
  const tomorrowStart = startOfDay(addDays(td, 1));
  if (isSameDay(ed, tomorrowStart)) {
    return "tomorrow";
  }
  const endThisWeek = endOfWeek(td, { weekStartsOn: 1 });
  const endThisWeekDay = startOfDay(endThisWeek);
  if (isAfter(ed, tomorrowStart) && !isAfter(ed, endThisWeekDay)) {
    return "restThisWeek";
  }
  const endNextWeek = endOfWeek(addWeeks(td, 1), { weekStartsOn: 1 });
  const endNextWeekDay = startOfDay(endNextWeek);
  if (isAfter(ed, endThisWeekDay) && !isAfter(ed, endNextWeekDay)) {
    return "nextWeek";
  }
  return "later";
}

function eventTypeStyles(type: string) {
  const t = type.toLowerCase();
  if (t === "court") {
    return {
      dot: "bg-destructive",
      border: "border-destructive/40",
      bg: "bg-destructive/5",
    };
  }
  if (t === "meeting") {
    return {
      dot: "bg-primary",
      border: "border-primary/40",
      bg: "bg-primary/5",
    };
  }
  return {
    dot: "bg-muted-foreground",
    border: "border-border",
    bg: "bg-muted/30",
  };
}

type CaseCalendarPanelProps = {
  caseSlug: string;
  caseDisplayName: string;
  events: CaseCalendarEvent[];
};

export function CaseCalendarPanel({
  caseSlug,
  caseDisplayName,
  events,
}: CaseCalendarPanelProps) {
  const [date, setDate] = useState<Date>(() => pickInitialDate(events));
  const [month, setMonth] = useState<Date>(() => {
    const d = pickInitialDate(events);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const d = pickInitialDate(events);
    setDate(d);
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    // Intentionally only caseSlug: events are always for the current case on navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset calendar when switching case
  }, [caseSlug]);

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CaseCalendarEvent[]> = {};
    for (const e of events) {
      const key = eventYmd(e);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key]!.push(e);
    }
    for (const key of Object.keys(grouped)) {
      grouped[key]!.sort(
        (a, b) => eventStartsAt(a).getTime() - eventStartsAt(b).getTime(),
      );
    }
    return grouped;
  }, [events]);

  const datesWithEvents = useMemo(() => {
    return Object.keys(eventsByDate).map((key) => {
      const [y, m, d] = key.split("-").map(Number);
      return new Date(y!, m! - 1, d!);
    });
  }, [eventsByDate]);

  const selectedKey = formatYmd(date);
  const selectedEvents = eventsByDate[selectedKey] ?? [];

  const upcomingSections = useMemo(() => {
    const now = currentTime;
    const todayStart = startOfDay(now);
    const upcoming = events
      .map((e) => ({ e, st: eventStartsAt(e) }))
      .filter(({ st }) => st.getTime() >= now.getTime())
      .sort((a, b) => a.st.getTime() - b.st.getTime());

    const byBucket: Record<BucketId, CaseCalendarEvent[]> = {
      today: [],
      tomorrow: [],
      restThisWeek: [],
      nextWeek: [],
      later: [],
    };
    for (const { e, st } of upcoming) {
      const b = bucketForEventDay(st, todayStart);
      byBucket[b]!.push(e);
    }

    return BUCKET_ORDER.map((id) => ({
      id,
      label: BUCKET_LABELS[id],
      events: byBucket[id]!,
    })).filter((s) => s.events.length > 0);
  }, [events, currentTime]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground text-sm">
          Court dates and appointments for {caseDisplayName} (demo only).
        </p>
      </div>

      <Card className="flex flex-col gap-4 border px-4 py-2 md:flex-row md:items-stretch">
        <div className="flex w-full shrink-0 items-start justify-center md:w-fit md:justify-start">
          <Calendar
            mode="single"
            required
            month={month}
            onMonthChange={setMonth}
            selected={date}
            onSelect={setDate}
            className="rounded-lg"
            showOutsideDays={false}
            modifiers={{
              hasEvent: datesWithEvents,
            }}
            modifiersClassNames={{
              hasEvent:
                "bg-primary/10 hover:bg-primary/20 data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground rounded-md",
            }}
          />
        </div>

        <div className="flex md:hidden">
          <Separator className="w-full" />
        </div>
        <div className="hidden min-h-[200px] py-6 md:flex">
          <Separator orientation="vertical" />
        </div>

        <div className="flex min-h-[220px] flex-1 flex-col py-2 pl-0 md:pl-2">
          <div className="flex flex-1 flex-col gap-6">
            <div className="flex items-center gap-2 pt-2 md:pt-4">
              <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                {date.toLocaleDateString("en-AU", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                {date.toDateString() === currentTime.toDateString() ? (
                  <span className="ml-2 text-xs">
                    •{" "}
                    {currentTime.toLocaleTimeString("en-AU", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                ) : null}
              </h3>
            </div>

            {selectedEvents.length === 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex w-full items-center rounded-lg border-2 border-dotted border-muted-foreground/30 bg-muted/30 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    No court dates or appointments on this day. Automatic reminders
                    would appear here in a full build.
                  </p>
                </div>
                <div
                  aria-hidden
                  className="flex w-full items-center rounded-lg border-2 border-dotted border-muted/40 bg-muted/5 px-4 py-5 opacity-50"
                />
              </div>
            ) : (
              <div className="flex max-h-[280px] flex-col gap-3 overflow-y-auto pr-2">
                {selectedEvents.map((ev) => {
                  const s = eventTypeStyles(ev.type);
                  const st = eventStartsAt(ev);
                  return (
                    <div
                      key={ev.id}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2.5 transition-colors",
                        s.bg,
                        s.border,
                      )}
                    >
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {format(st, "p", { locale: enAU })}
                            </span>
                            <span className="shrink-0 text-muted-foreground/60">
                              •
                            </span>
                            <p className="truncate text-sm font-medium">{ev.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <ReactTimeago
                              date={st}
                              formatter={countdownFormatter}
                            />
                          </p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
                            s.bg,
                            s.border,
                          )}
                        >
                          <span
                            className={cn("size-1.5 shrink-0 rounded-full", s.dot)}
                          />
                          {ev.type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="border px-4 py-5">
        <h2 className="text-lg font-semibold tracking-tight">Upcoming events</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Starts from now, grouped by when they fall. Relative times update live.
        </p>

        {upcomingSections.length === 0 ? (
          <p className="text-muted-foreground mt-4 text-sm">
            No upcoming court dates or appointments.
          </p>
        ) : (
          <div className="mt-5 space-y-6">
            {upcomingSections.map((section) => (
              <section key={section.id} aria-labelledby={`upcoming-${section.id}`}>
                <h3
                  id={`upcoming-${section.id}`}
                  className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide"
                >
                  {section.label}
                </h3>
                <ul className="flex flex-col gap-3" role="list">
                  {section.events.map((ev) => {
                    const s = eventTypeStyles(ev.type);
                    const st = eventStartsAt(ev);
                    return (
                      <li key={ev.id} role="listitem">
                        <div
                          className={cn(
                            "flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
                            s.bg,
                            s.border,
                          )}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-sm font-medium leading-snug">{ev.title}</p>
                            <p className="text-muted-foreground text-xs sm:text-sm">
                              {format(st, "EEE d MMM yyyy · p", { locale: enAU })}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              <ReactTimeago date={st} formatter={countdownFormatter} />
                            </p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex w-fit shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
                              s.bg,
                              s.border,
                            )}
                          >
                            <span
                              className={cn("size-1.5 shrink-0 rounded-full", s.dot)}
                            />
                            {ev.type}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
