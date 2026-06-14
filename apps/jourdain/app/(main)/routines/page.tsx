"use client";

import { useState } from "react";
import { Clock, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
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
];
// Display Monday-first; values are 0=Sun..6=Sat to match the backend.
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

function scheduleLabel(routine: Routine): string {
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

  const byPillar = PILLARS.map((pillar) => ({
    pillar,
    items: (routines ?? []).filter((r) => r.domain === pillar.value),
  })).filter((group) => group.items.length > 0);

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
      ) : (routines ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Repeat className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">No routines yet</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Add recurring reminders — brush teeth, gym days, mow the lawn — and
              they&apos;ll appear in your tasks and push to your phone at the set
              time.
            </p>
            <Button size="sm" className="mt-2 gap-1.5" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New routine
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {byPillar.map(({ pillar, items }) => (
            <div key={pillar.value} className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {pillar.label}
              </h2>
              <div className="space-y-2">
                {items.map((routine) => (
                  <Card key={routine.id}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          routine.active
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Repeat className="h-4 w-4" />
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
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {scheduleLabel(routine)}
                        </p>
                      </div>
                      <Switch
                        checked={routine.active}
                        onCheckedChange={(active) =>
                          updateRoutine.mutate({
                            routineId: routine.id,
                            input: { active },
                          })
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

  // Sync the form to the routine being edited whenever the dialog (re)opens.
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
  }
  if (!open && lastKey !== null) setLastKey(null);

  const pending = createRoutine.isPending || updateRoutine.isPending;
  const error = createRoutine.error ?? updateRoutine.error;
  const canSave =
    title.trim().length > 0 &&
    (freq !== "weekly" || days.length > 0) &&
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
      remindTime: time,
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
            placeholder="e.g. Brush teeth"
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

          <div className="flex items-center gap-3">
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
          </div>

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
