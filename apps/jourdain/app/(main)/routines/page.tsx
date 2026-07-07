"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO } from "date-fns";
import { Bell, Clock, GitBranch, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
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
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { PageHeader } from "@/components/page-header";
import {
  useCreateRoutine,
  useDeleteRoutine,
  useRoutines,
  useUpdateRoutine,
  type Routine,
  type RoutineDomain,
  type RoutineFreq,
} from "@/hooks/routines/use-routines";

const PILLARS: { value: RoutineDomain; label: string; dot: string }[] = [
  { value: "identity", label: "Identity", dot: "bg-violet-500" },
  { value: "health", label: "Health", dot: "bg-emerald-500" },
  { value: "work", label: "Work", dot: "bg-blue-500" },
  { value: "social", label: "Social", dot: "bg-amber-500" },
  { value: "finance", label: "Finance", dot: "bg-rose-500" },
];
// The schedule-type selector folds freq + the on_complete trigger into one list.
type Mode = RoutineFreq | "on_complete";
const MODES: { value: Mode; label: string }[] = [
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Specific days" },
  { value: "monthly", label: "Monthly" },
  { value: "interval", label: "Every few minutes" },
  { value: "on_complete", label: "After another routine" },
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
const OFFSET_UNITS: { value: number; label: string }[] = [
  { value: 1, label: "minutes" },
  { value: 60, label: "hours" },
  { value: 1440, label: "days" },
];

function everyLabel(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "hour" : `${hours} hours`;
  }
  return `${minutes} min`;
}

function offsetLabel(minutes: number): string {
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hr${hours === 1 ? "" : "s"}`;
  }
  return `${minutes} min`;
}

function scheduleLabel(routine: Routine, parentTitle?: string): string {
  if (routine.triggerType === "on_complete") {
    const after = parentTitle ?? "completing";
    return `After ${after} · +${offsetLabel(routine.offsetMinutes ?? 0)}`;
  }
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
  if (routine.freq !== "interval" || !routine.nextFireAt) return null;
  try {
    return `Next ${format(parseISO(routine.nextFireAt), "h:mm a")}`;
  } catch {
    return null;
  }
}

function routineIcon(routine: Routine) {
  if (routine.triggerType === "on_complete") return GitBranch;
  if (routine.freq === "interval") return Bell;
  return Repeat;
}

export default function RoutinesPage() {
  const { data: routines, isLoading } = useRoutines();
  const updateRoutine = useUpdateRoutine();
  const deleteRoutine = useDeleteRoutine();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [view, setView] = useState<"list" | "board">("list");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 160, tolerance: 6 },
    })
  );

  const all = useMemo(() => routines ?? [], [routines]);
  const titleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const routine of all) map.set(routine.id, routine.title);
    return map;
  }, [all]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(routine: Routine) {
    setEditing(routine);
    setDialogOpen(true);
  }
  function parentTitleFor(routine: Routine): string | undefined {
    return routine.parentRoutineId
      ? titleById.get(routine.parentRoutineId)
      : undefined;
  }

  const pings = all.filter((r) => r.freq === "interval");
  const byPillar = PILLARS.map((pillar) => ({
    pillar,
    items: all.filter(
      (r) => r.domain === pillar.value && r.freq !== "interval"
    ),
  })).filter((group) => group.items.length > 0);

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const overKey = event.over?.id as RoutineDomain | undefined;
    if (!overKey) return;
    const routine = all.find((item) => item.id === event.active.id);
    if (!routine || routine.domain === overKey) return;
    updateRoutine.mutate({
      routineId: routine.id,
      input: { domain: overKey },
    });
  }

  const activeRoutine = all.find((r) => r.id === activeId) ?? null;

  function RoutineRow({ routine }: { routine: Routine }) {
    const Icon = routineIcon(routine);
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
            <Icon className="h-4 w-4" />
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
                {scheduleLabel(routine, parentTitleFor(routine))}
              </span>
              {routine.active && next ? (
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
    <section className="w-full space-y-6">
      <PageHeader
        title="Routines"
        actions={
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New routine
          </Button>
        }
      />

      <div className="inline-flex rounded-lg border border-border/60 p-0.5 text-sm">
        {(["list", "board"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setView(option)}
            aria-pressed={view === option}
            className={cn(
              "rounded-md px-3 py-1 capitalize transition-colors",
              view === option
                ? "bg-muted font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mx-auto w-full max-w-7xl space-y-2">
          <Skeleton className="h-3 w-20" />
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[60px] w-full rounded-xl" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Repeat className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">No routines yet</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Add recurring reminders, a drink-water ping, or a routine that
              triggers another when you finish it.
            </p>
            <Button size="sm" className="mt-2 gap-1.5" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New routine
            </Button>
          </CardContent>
        </Card>
      ) : view === "board" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(event: DragStartEvent) =>
            setActiveId(String(event.active.id))
          }
          onDragCancel={() => setActiveId(null)}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-3">
            {PILLARS.map((pillar) => (
              <BoardColumn
                key={pillar.value}
                pillar={pillar}
                routines={all.filter((r) => r.domain === pillar.value)}
                parentTitleFor={parentTitleFor}
                onOpen={openEdit}
              />
            ))}
          </div>
          <DragOverlay>
            {activeRoutine ? (
              <BoardCard
                routine={activeRoutine}
                parentTitle={parentTitleFor(activeRoutine)}
                dragging
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="mx-auto w-full max-w-7xl space-y-5">
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
        routines={all}
      />
    </section>
  );
}

function BoardColumn({
  pillar,
  routines,
  parentTitleFor,
  onOpen,
}: {
  pillar: { value: RoutineDomain; label: string; dot: string };
  routines: Routine[];
  parentTitleFor: (routine: Routine) => string | undefined;
  onOpen: (routine: Routine) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: pillar.value });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col rounded-xl border border-border/60 bg-muted/20 p-2 transition-colors",
        isOver && "border-primary/60 bg-primary/5"
      )}
    >
      <div className="flex items-center gap-2 px-1 pb-2">
        <span className={cn("h-2 w-2 rounded-full", pillar.dot)} />
        <span className="text-sm font-medium">{pillar.label}</span>
        <span className="text-xs text-muted-foreground">{routines.length}</span>
      </div>
      <div className="flex min-h-16 flex-1 flex-col gap-2">
        {routines.map((routine) => (
          <DraggableRoutine
            key={routine.id}
            routine={routine}
            parentTitle={parentTitleFor(routine)}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

function DraggableRoutine({
  routine,
  parentTitle,
  onOpen,
}: {
  routine: Routine;
  parentTitle?: string;
  onOpen: (routine: Routine) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: routine.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
      }}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(routine)}
    >
      <BoardCard routine={routine} parentTitle={parentTitle} />
    </div>
  );
}

function BoardCard({
  routine,
  parentTitle,
  dragging,
}: {
  routine: Routine;
  parentTitle?: string;
  dragging?: boolean;
}) {
  const Icon = routineIcon(routine);
  return (
    <div
      className={cn(
        "cursor-grab touch-none rounded-lg border border-border/60 bg-card p-2.5 text-left shadow-sm active:cursor-grabbing",
        !routine.active && "opacity-60",
        dragging && "rotate-2 shadow-lg"
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p
          className={cn(
            "truncate text-sm font-medium",
            !routine.active && "line-through"
          )}
        >
          {routine.title}
        </p>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {scheduleLabel(routine, parentTitle)}
      </p>
    </div>
  );
}

function RoutineDialog({
  open,
  onOpenChange,
  editing,
  routines,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Routine | null;
  routines: Routine[];
}) {
  const createRoutine = useCreateRoutine();
  const updateRoutine = useUpdateRoutine();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [domain, setDomain] = useState<RoutineDomain>("health");
  const [mode, setMode] = useState<Mode>("daily");
  const [days, setDays] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [time, setTime] = useState("08:00");
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [windowStart, setWindowStart] = useState("08:00");
  const [windowEnd, setWindowEnd] = useState("21:00");
  const [parentId, setParentId] = useState<string>("");
  const [offsetValue, setOffsetValue] = useState(5);
  const [offsetUnit, setOffsetUnit] = useState(1);

  const formKey = `${open ? "open" : "closed"}:${editing?.id ?? "new"}`;
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (open && formKey !== lastKey) {
    setLastKey(formKey);
    setTitle(editing?.title ?? "");
    setNotes(editing?.notes ?? "");
    setDomain(editing?.domain ?? "health");
    setMode(
      editing
        ? editing.triggerType === "on_complete"
          ? "on_complete"
          : editing.freq
        : "daily"
    );
    setDays(editing?.daysOfWeek ?? []);
    setDayOfMonth(editing?.dayOfMonth ?? 1);
    setTime(editing?.remindTime ?? "08:00");
    setIntervalMinutes(editing?.intervalMinutes ?? 30);
    setWindowStart(editing?.windowStart ?? "08:00");
    setWindowEnd(editing?.windowEnd ?? "21:00");
    setParentId(editing?.parentRoutineId ?? "");
    const off = editing?.offsetMinutes ?? 5;
    const unit = off % 1440 === 0 ? 1440 : off % 60 === 0 ? 60 : 1;
    setOffsetUnit(unit);
    setOffsetValue(off / unit);
  }
  if (!open && lastKey !== null) setLastKey(null);

  const parentOptions = routines.filter(
    (r) => r.id !== editing?.id && r.triggerType === "schedule"
  );

  const pending = createRoutine.isPending || updateRoutine.isPending;
  const error = createRoutine.error ?? updateRoutine.error;
  const canSave =
    title.trim().length > 0 &&
    (mode !== "weekly" || days.length > 0) &&
    (mode !== "interval" || intervalMinutes > 0) &&
    (mode !== "on_complete" || (parentId !== "" && offsetValue >= 0)) &&
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
    const isTrigger = mode === "on_complete";
    const input = {
      title: title.trim(),
      notes: notes.trim() || null,
      domain,
      freq: (isTrigger ? "daily" : mode) as RoutineFreq,
      triggerType: (isTrigger ? "on_complete" : "schedule") as
        | "on_complete"
        | "schedule",
      parentRoutineId: isTrigger ? parentId : null,
      offsetMinutes: isTrigger ? Math.round(offsetValue * offsetUnit) : null,
      daysOfWeek: mode === "weekly" ? days : [],
      dayOfMonth: mode === "monthly" ? dayOfMonth : null,
      remindTime: mode === "interval" || isTrigger ? undefined : time,
      intervalMinutes: mode === "interval" ? intervalMinutes : null,
      windowStart: mode === "interval" ? windowStart : undefined,
      windowEnd: mode === "interval" ? windowEnd : undefined,
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
            placeholder="e.g. Take meds"
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
              <label className="text-xs text-muted-foreground">Trigger</label>
              <Select
                value={mode}
                onValueChange={(value) => setMode(value as Mode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {mode === "weekly" ? (
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

          {mode === "monthly" ? (
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

          {mode === "interval" ? (
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
                      Math.min(1440, Math.max(1, Number(event.target.value) || 1))
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
          ) : null}

          {mode === "on_complete" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  After I complete
                </label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a routine…" />
                  </SelectTrigger>
                  <SelectContent>
                    {parentOptions.map((routine) => (
                      <SelectItem key={routine.id} value={routine.id}>
                        {routine.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">
                    Remind after
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={offsetValue}
                    onChange={(event) =>
                      setOffsetValue(Math.max(0, Number(event.target.value) || 0))
                    }
                    className="w-24"
                  />
                </div>
                <Select
                  value={String(offsetUnit)}
                  onValueChange={(value) => setOffsetUnit(Number(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OFFSET_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={String(unit.value)}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {mode !== "interval" && mode !== "on_complete" ? (
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
          ) : null}

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
