"use client";

import { useMemo, useState } from "react";
import {
  Cake,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Trash2,
  Unplug,
} from "lucide-react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";
import { TaskDetailDialog } from "@/components/organisms/task-detail-dialog";
import {
  useCalendarEvents,
  useCreateEvent,
  useDeleteEvent,
  useDisconnectGoogle,
  useGoogleStatus,
} from "@/hooks/calendar/use-calendar";
import { useTasks } from "@/hooks/tasks/use-tasks";
import { usePeople } from "@/hooks/people/use-people";
import type { CalendarEvent } from "@/entities/calendar/model/types";
import type { Person } from "@/entities/people/model/types";
import type { Task, TaskPriority } from "@/entities/tasks/model/types";

const PRIORITY_DOT: Record<TaskPriority, string> = {
  1: "bg-red-500",
  2: "bg-orange-400",
  3: "bg-blue-500",
  4: "bg-muted-foreground/50",
};

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  not_configured:
    "Google credentials are missing — add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local.",
  denied: "Google access was declined.",
  state_mismatch: "The sign-in flow expired — try connecting again.",
  no_refresh_token:
    "Google didn't return a refresh token — remove Jourdain's access at myaccount.google.com/permissions and reconnect.",
  exchange_failed: "Connecting to Google failed — check the server logs.",
};

const MAX_ITEMS_PER_DAY = 3;

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState(() =>
    format(new Date(), "yyyy-MM-dd"),
  );
  const [googleError] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("google_error"),
  );

  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const { data: status } = useGoogleStatus();
  const connected = status?.connected ?? false;
  const disconnect = useDisconnectGoogle();

  const { data: events, isFetching: eventsFetching } = useCalendarEvents(
    gridStart.toISOString(),
    addDays(gridEnd, 1).toISOString(),
    connected,
  );
  const { data: tasks } = useTasks();
  const selectedTask = tasks?.find((task) => task.id === selectedTaskId) ?? null;

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events ?? []) {
      const key = event.allDay
        ? event.start
        : format(parseISO(event.start), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks ?? []) {
      if (task.status !== "open" || !task.dueDate) continue;
      map.set(task.dueDate, [...(map.get(task.dueDate) ?? []), task]);
    }
    return map;
  }, [tasks]);

  const { data: people } = usePeople();
  const birthdaysByDay = useMemo(() => {
    const map = new Map<string, Person[]>();
    for (const person of people ?? []) {
      if (!person.birthdayMonth || !person.birthdayDay) continue;
      const key = `${String(person.birthdayMonth).padStart(2, "0")}-${String(person.birthdayDay).padStart(2, "0")}`;
      map.set(key, [...(map.get(key) ?? []), person]);
    }
    return map;
  }, [people]);

  function openCreate(date: Date) {
    if (!connected) return;
    setCreateDate(format(date, "yyyy-MM-dd"));
    setCreateOpen(true);
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {format(cursor, "MMMM yyyy")}
          </h1>
          {eventsFetching ? (
            <span className="text-xs text-muted-foreground">Syncing...</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous month"
            onClick={() => setCursor((current) => addMonths(current, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setCursor(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Next month"
            onClick={() => setCursor((current) => addMonths(current, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {connected ? (
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => openCreate(new Date())}
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              New event
            </Button>
          ) : null}
        </div>
      </div>

      {googleError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {GOOGLE_ERROR_MESSAGES[googleError] ?? "Google connection failed."}
        </p>
      ) : null}

      {status && !connected ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Connect Google Calendar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Your Google events will appear here, and tasks with due dates sync
              to a dedicated &quot;Jourdain&quot; calendar in Google.
            </p>
            <Button asChild size="sm" disabled={!status.configured}>
              <a href="/api/google/connect">Connect</a>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {connected ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          Connected as {status?.email}
          <button
            type="button"
            className="inline-flex items-center gap-1 text-muted-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => disconnect.mutate()}
          >
            <Unplug className="h-3 w-3" />
            disconnect
          </button>
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border/60">
        <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30 text-center text-xs font-medium text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDay.get(key) ?? [];
            const dayTasks = tasksByDay.get(key) ?? [];
            const total = dayEvents.length + dayTasks.length;
            const overflow = total - MAX_ITEMS_PER_DAY;
            const visibleEvents = dayEvents.slice(0, MAX_ITEMS_PER_DAY);
            const visibleTasks = dayTasks.slice(
              0,
              Math.max(0, MAX_ITEMS_PER_DAY - visibleEvents.length),
            );

            return (
              <div
                key={key}
                className={cn(
                  "min-h-28 border-b border-r border-border/40 p-1.5 align-top",
                  !isSameMonth(day, cursor) && "bg-muted/20",
                  connected && "cursor-pointer hover:bg-muted/30",
                )}
                onClick={() => openCreate(day)}
              >
                <div className="mb-1 flex justify-end">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      isToday(day)
                        ? "bg-primary font-semibold text-primary-foreground"
                        : isSameMonth(day, cursor)
                          ? "text-foreground"
                          : "text-muted-foreground/60",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-1">
                  {(birthdaysByDay.get(format(day, "MM-dd")) ?? []).map(
                    (person) => (
                      <div
                        key={person.id}
                        className="flex w-full items-center gap-1 truncate rounded bg-pink-500/15 px-1.5 py-0.5 text-[11px] text-foreground"
                        title={`${person.fullName}'s birthday`}
                      >
                        <Cake className="h-3 w-3 shrink-0 text-pink-500" />
                        <span className="truncate">
                          {person.fullName.split(" ")[0]}
                        </span>
                      </div>
                    ),
                  )}
                  {visibleEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      className="block w-full truncate rounded bg-primary/15 px-1.5 py-0.5 text-left text-[11px] text-foreground hover:bg-primary/25"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        setSelectedEvent(event);
                      }}
                    >
                      {!event.allDay
                        ? `${format(parseISO(event.start), "HH:mm")} · `
                        : ""}
                      {event.title}
                    </button>
                  ))}
                  {visibleTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className="flex w-full items-center gap-1.5 truncate rounded border border-border/60 bg-card px-1.5 py-0.5 text-left text-[11px] text-foreground hover:border-border"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        setSelectedTaskId(task.id);
                      }}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          PRIORITY_DOT[task.priority],
                        )}
                      />
                      <span className="truncate">{task.title}</span>
                    </button>
                  ))}
                  {overflow > 0 ? (
                    <p className="px-1 text-[10px] text-muted-foreground">
                      +{overflow} more
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CreateEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultDate={createDate}
      />
      <EventDetailsDialog
        event={selectedEvent}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
      />
      <TaskDetailDialog
        task={selectedTask}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
      />
    </section>
  );
}

function CreateEventDialog({
  open,
  onOpenChange,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: string;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const createEvent = useCreateEvent();

  // Re-sync the date when the dialog opens for a different day.
  const [lastDefault, setLastDefault] = useState(defaultDate);
  if (defaultDate !== lastDefault) {
    setLastDefault(defaultDate);
    setDate(defaultDate);
  }

  function handleSubmit() {
    if (!title.trim() || createEvent.isPending) return;
    createEvent.mutate(
      {
        title: title.trim(),
        date,
        allDay,
        startTime: allDay ? undefined : startTime,
        endTime: allDay ? undefined : endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      {
        onSuccess: () => {
          setTitle("");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New event</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Event title"
            autoFocus
          />
          <div className="flex items-center gap-3">
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-40"
              aria-label="Date"
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={allDay} onCheckedChange={setAllDay} />
              All day
            </label>
          </div>
          {!allDay ? (
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="w-28"
                aria-label="Start time"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="w-28"
                aria-label="End time"
              />
            </div>
          ) : null}
          {createEvent.error ? (
            <p className="text-sm text-destructive">
              {createEvent.error.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="submit"
              disabled={!title.trim() || createEvent.isPending}
            >
              {createEvent.isPending ? "Creating..." : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EventDetailsDialog({
  event,
  onOpenChange,
}: {
  event: CalendarEvent | null;
  onOpenChange: (open: boolean) => void;
}) {
  const deleteEvent = useDeleteEvent();

  function formatWhen(current: CalendarEvent): string {
    if (current.allDay) {
      return format(parseISO(current.start), "EEEE d MMMM");
    }
    const start = parseISO(current.start);
    const end = parseISO(current.end);
    return `${format(start, "EEE d MMM, HH:mm")} – ${format(end, "HH:mm")}`;
  }

  return (
    <Dialog open={event !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {event ? (
          <>
            <DialogHeader>
              <DialogTitle>{event.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">{formatWhen(event)}</p>
              {event.location ? (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.location}
                </p>
              ) : null}
            </div>
            <DialogFooter className="flex-row justify-between sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-destructive"
                onClick={() =>
                  deleteEvent.mutate(event.id, {
                    onSuccess: () => onOpenChange(false),
                  })
                }
                disabled={deleteEvent.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
              {event.htmlLink ? (
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <a href={event.htmlLink} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in Google
                  </a>
                </Button>
              ) : null}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
