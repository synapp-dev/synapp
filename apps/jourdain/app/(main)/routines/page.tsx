"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Bell, Clock, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Switch } from "@workspace/ui/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";
import {
  useCreateRoutine,
  useDeleteRoutine,
  useRoutines,
  useUpdateRoutine,
  type Routine,
  type RoutineDomain,
  type RoutineFreq,
} from "@/hooks/routines/use-routines";

const PILLARS: { value: RoutineDomain; label: string }[] = [
  { value: "identity", label: "Identity" },
  { value: "health", label: "Health" },
  { value: "work", label: "Work" },
  { value: "social", label: "Social" },
  { value: "finance", label: "Finance" },
];
const FREQS: { value: RoutineFreq; label: string }[] = [
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Specific days" },
  { value: "monthly", label: "Monthly" },
  { value: "interval", label: "Every few minutes" },
];
const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];
const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function everyLabel(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "hour" : `${hours} hours`;
  }
  return `${minutes} min`;
}

function scheduleLabel(routine: Routine): string {
  if (routine.freq === "interval") {
    return `Every ${everyLabel(routine.intervalMinutes ?? 0)} · ${routine.windowStart}–${routine.windowEnd}`;
  }
  const time = routine.remindTime;
  if (routine.freq === "daily") return `Every day · ${time}`;
  if (routine.freq === "weekly") {
    if (routine.daysOfWeek.length === 0) return `Weekly · ${time}`;
    const days = [...routine.daysOfWeek]
      .sort((a, b) => a - b)
      .map((d) => DOW_SHORT[d])
      .join(" ");
    return `${days} · ${time}`;
  }
  return `Monthly · day ${routine.dayOfMonth ?? "?"} · ${time}`;
}

function nextFireLabel(routine: Routine): string | null {
  if (!routine.nextFireAt) return null;
  try {
    return `Next ${format(parseISO(routine.nextFireAt), "h:mm a")}`;
  } catch {
    return null;
  }
}

export default function RoutinesPage() {
  const { data: routines, isLoading } = useRoutines();
  const updateRoutine = useUpdateRoutine();
  const deleteRoutine = useDeleteRoutine();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(routine: Routine) {
    setEditing(routine);
    setDialogOpen(true);
  }

  const all = routines ?? [];
  const pings = all.filter((r) => r.freq === "interval");
  const byPillar = PILLARS.map((pillar) => ({
    pillar,
    items: all.filter((r) => r.domain === pillar.value && r.freq !== "interval"),
  })).filter((group) => group.items.length > 0);

  function RoutineRow({ routine }: { routine: Routine }) {
    const next = nextFireLabel(routine);
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              routine.active
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {routine.freq === "interval" ? (
              <Bell className="h-4 w-4" />
            ) : (
              <Repeat className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-sm font-medium",
                !routine.active && "text-muted-foreground line-through"
              )}
            >
              {routine.title}
            </p>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {scheduleLabel(routine)}
              </span>
              {routine.active && routine.freq === "interval" && next ? (
                <span className="text-primary">· {next}</span>
              ) : null}
            </p>
          </div>
          <Switch
            checked={routine.active}
            onCheckedChange={(active) =>
              updateRoutine.mutate({ routineId: routine.id, input: { active } })
            }
            aria-label="Active"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            aria-label="Edit"
            onClick={() => openEdit(routine)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label="Delete"
            onClick={() => deleteRoutine.mutate(routine.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Routines</h1>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New routine
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : all.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Repeat className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">No routines yet</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Add recurring reminders — brush teeth, gym days, mow the lawn, or a
              drink-water ping every 30 minutes.
            </p>
            <Button size="sm" className="mt-2 gap-1.5" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New routine
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {pings.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recurring
              </h2>
              <div className="space-y-2">
                {pings.map((routine) => (
                  <RoutineRow key={routine.id} routine={routine} />
                ))}
              </div>
            </div>
          ) : null}

          {byPillar.map(({ pillar, items }) => (
            <div key={pillar.value} className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {pillar.label}
              </h2>
              <div className="space-y-2">
                {items.map((routine) => (
                  <RoutineRow key={routine.id} routine={routine} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <RoutineDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
    </section>
  );
}

function RoutineDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Routine | null;
}) {
  const createRoutine = useCreateRoutine();
  const updateRoutine = useUpdateRoutine();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [domain, setDomain] = useState<RoutineDomain>("health");
  const [freq, setFreq] = useState<RoutineFreq>("daily");
  const [days, setDays] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [time, setTime] = useState("08:00");
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [windowStart, setWindowStart] = useState("08:00");
  const [windowEnd, setWindowEnd] = useState("21:00");

  const formKey = `${open ? "open" : "closed"}:${editing?.id ?? "new"}`;
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (open && formKey !== lastKey) {
    setLastKey(formKey);
    setTitle(editing?.title ?? "");
    setNotes(editing?.notes ?? "");
    setDomain(editing?.domain ?? "health");
    setFreq(editing?.freq ?? "daily");
    setDays(editing?.daysOfWeek ?? []);
    setDayOfMonth(editing?.dayOfMonth ?? 1);
    setTime(editing?.remindTime ?? "08:00");
    setIntervalMinutes(editing?.intervalMinutes ?? 30);
    setWindowStart(editing?.windowStart ?? "08:00");
    setWindowEnd(editing?.windowEnd ?? "21:00");
  }
  if (!open && lastKey !== null) setLastKey(null);

  const pending = createRoutine.isPending || updateRoutine.isPending;
  const error = createRoutine.error ?? updateRoutine.error;
  const canSave =
    title.trim().length > 0 &&
    (freq !== "weekly" || days.length > 0) &&
    (freq !== "interval" || intervalMinutes > 0) &&
    !pending;

  function toggleDay(value: number) {
    setDays((current) =>
      current.includes(value)
        ? current.filter((d) => d !== value)
        : [...current, value]
    );
  }

  function handleSubmit() {
    if (!canSave) return;
    const input = {
      title: title.trim(),
      notes: notes.trim() || null,
      domain,
      freq,
      daysOfWeek: freq === "weekly" ? days : [],
      dayOfMonth: freq === "monthly" ? dayOfMonth : null,
      remindTime: freq === "interval" ? undefined : time,
      intervalMinutes: freq === "interval" ? intervalMinutes : null,
      windowStart: freq === "interval" ? windowStart : undefined,
      windowEnd: freq === "interval" ? windowEnd : undefined,
    };
    if (editing) {
      updateRoutine.mutate(
        { routineId: editing.id, input },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createRoutine.mutate(input, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit routine" : "New routine"}</DialogTitle>
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
            placeholder="e.g. Drink water"
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Pillar</label>
              <Select
                value={domain}
                onValueChange={(value) => setDomain(value as RoutineDomain)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PILLARS.map((pillar) => (
                    <SelectItem key={pillar.value} value={pillar.value}>
                      {pillar.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Repeat</label>
              <Select
                value={freq}
                onValueChange={(value) => setFreq(value as RoutineFreq)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {freq === "weekly" ? (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">On days</label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "h-8 w-11 rounded-md border text-xs font-medium transition-colors",
                      days.includes(day.value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 text-muted-foreground hover:border-border"
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {freq === "monthly" ? (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Day of month
              </label>
              <Input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(event) =>
                  setDayOfMonth(
                    Math.min(31, Math.max(1, Number(event.target.value) || 1))
                  )
                }
                className="w-24"
              />
            </div>
          ) : null}

          {freq === "interval" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  Remind me every (minutes)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={1440}
                  value={intervalMinutes}
                  onChange={(event) =>
                    setIntervalMinutes(
                      Math.min(
                        1440,
                        Math.max(1, Number(event.target.value) || 1)
                      )
                    )
                  }
                  className="w-28"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">From</label>
                  <Input
                    type="time"
                    value={windowStart}
                    onChange={(event) => setWindowStart(event.target.value)}
                    className="w-32"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">To</label>
                  <Input
                    type="time"
                    value={windowEnd}
                    onChange={(event) => setWindowEnd(event.target.value)}
                    className="w-32"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Reminder time
              </label>
              <Input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="w-32"
              />
            </div>
          )}

          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes (optional)"
            rows={2}
          />

          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={!canSave}>
              {pending
                ? "Saving…"
                : editing
                  ? "Save changes"
                  : "Create routine"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
