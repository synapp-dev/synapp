"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ChevronLeft, Flame, Gauge, GripVertical, Play, RefreshCw } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";
import { usePrograms, useSessionPreview, useStartSession } from "@/hooks/gym/use-gym";
import {
  MUSCLE_SUBGROUP_LABELS,
  type SessionIntensity,
  type SessionPreviewExercise,
} from "@/entities/gym/model/types";

const WARMUP_OPTIONS = [0, 1, 2, 3];
const WORKING_OPTIONS = [1, 2, 3, 4, 5, 6];
const DROP_OPTIONS = [0, 1, 2, 3];
// null = auto (per-kind defaults), then 15s increments, 15s to 5min.
const REST_OPTIONS = [null, ...Array.from({ length: 20 }, (_, i) => (i + 1) * 15)];

function restLabel(seconds: number | null): string {
  if (seconds === null) return "Auto";
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  if (mm === 0) return `${ss}s`;
  return ss === 0 ? `${mm}m` : `${mm}m ${ss}s`;
}

type PlanField = "warmupSets" | "workingSets" | "dropSets" | "restSeconds";

function PlanValueSelect({
  label,
  value,
  options,
  format,
  onChange,
}: {
  label: string;
  value: number | null;
  options: (number | null)[];
  format?: (v: number | null) => string;
  onChange: (v: number | null) => void;
}) {
  const toKey = (v: number | null) => (v === null ? "auto" : String(v));
  return (
    <label className="min-w-0 flex-1 space-y-0.5">
      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Select value={toKey(value)} onValueChange={(v) => onChange(v === "auto" ? null : Number(v))}>
        <SelectTrigger className="h-10 w-full px-2 text-sm tabular-nums">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={toKey(opt)} value={toKey(opt)}>
              {format ? format(opt) : String(opt)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function PlanRowCard({
  row,
  dragging,
  handleProps,
  onChange,
}: {
  row: SessionPreviewExercise;
  dragging?: boolean;
  handleProps?: Record<string, unknown>;
  onChange?: (field: PlanField, value: number | null) => void;
}) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border bg-background p-2.5",
        dragging && "rotate-1 shadow-lg"
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Reorder"
          className="cursor-grab touch-none rounded p-1.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground active:cursor-grabbing"
          {...handleProps}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</p>
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {MUSCLE_SUBGROUP_LABELS[row.subgroup]}
        </Badge>
      </div>
      <div className="flex gap-1.5 pl-1">
        <PlanValueSelect
          label="Warm-up"
          value={row.warmupSets}
          options={WARMUP_OPTIONS}
          onChange={(v) => onChange?.("warmupSets", v)}
        />
        <PlanValueSelect
          label="Working"
          value={row.workingSets}
          options={WORKING_OPTIONS}
          onChange={(v) => onChange?.("workingSets", v)}
        />
        <PlanValueSelect
          label="Drop"
          value={row.dropSets}
          options={DROP_OPTIONS}
          onChange={(v) => onChange?.("dropSets", v)}
        />
        <PlanValueSelect
          label="Rest"
          value={row.restSeconds}
          options={REST_OPTIONS}
          format={restLabel}
          onChange={(v) => onChange?.("restSeconds", v)}
        />
      </div>
    </div>
  );
}

function DraggablePlanRow({
  row,
  onChange,
}: {
  row: SessionPreviewExercise;
  onChange: (field: PlanField, value: number | null) => void;
}) {
  const draggable = useDraggable({ id: row.exerciseId });
  const droppable = useDroppable({ id: row.exerciseId });

  return (
    <div
      ref={(node) => {
        draggable.setNodeRef(node);
        droppable.setNodeRef(node);
      }}
      style={{
        transform: CSS.Translate.toString(draggable.transform),
        opacity: draggable.isDragging ? 0.4 : 1,
      }}
      className={cn(droppable.isOver && !draggable.isDragging && "translate-y-0.5")}
    >
      <PlanRowCard row={row} handleProps={{ ...draggable.listeners, ...draggable.attributes }} onChange={onChange} />
    </div>
  );
}

/**
 * Start button that walks through a small wizard in a mobile bottom-sheet:
 * pick the intensity, then (for program starts) review and tune the session
 * plan before it begins. Used wherever a workout is kicked off: Today and
 * Programs.
 */
export function StartSessionButton({
  programId,
  exerciseIds,
  label = "Start",
  className,
  size = "sm",
}: {
  programId?: string;
  exerciseIds?: string[];
  label?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  const router = useRouter();
  const startSession = useStartSession();
  const preview = useSessionPreview();
  const { data: programs } = usePrograms();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"intensity" | "plan">("intensity");
  const [intensity, setIntensity] = useState<SessionIntensity>("normal");
  const [rows, setRows] = useState<SessionPreviewExercise[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const isSmart = programs?.find((p) => p.id === programId)?.isSmart ?? false;
  const activeRow = rows.find((r) => r.exerciseId === activeId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } })
  );

  const start = async (chosen: SessionIntensity, plan?: SessionPreviewExercise[]) => {
    const session = await startSession.mutateAsync({
      programId: programId ?? null,
      exerciseIds,
      intensity: chosen,
      plan: plan?.map((r) => ({
        exerciseId: r.exerciseId,
        warmupSets: r.warmupSets,
        workingSets: r.workingSets,
        dropSets: r.dropSets,
        restSeconds: r.restSeconds,
      })),
    });
    setOpen(false);
    router.push(`/health/gym/session/${session.id}`);
  };

  const chooseIntensity = (chosen: SessionIntensity) => {
    setIntensity(chosen);
    if (!programId) {
      // Ad-hoc starts have no program to preview; begin straight away.
      void start(chosen);
      return;
    }
    setStep("plan");
    // Only fetch on first entry; coming back from the plan step keeps tuning.
    if (rows.length === 0) preview.mutate(programId, { onSuccess: setRows });
  };

  const regenerate = () => {
    if (programId) preview.mutate(programId, { onSuccess: setRows });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const overId = event.over?.id;
    const dragId = event.active.id;
    if (!overId || overId === dragId) return;
    const from = rows.findIndex((r) => r.exerciseId === dragId);
    const to = rows.findIndex((r) => r.exerciseId === overId);
    if (from < 0 || to < 0) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    setRows(next);
  };

  const updateRow = (exerciseId: string, field: PlanField, value: number | null) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.exerciseId !== exerciseId) return r;
        if (field === "restSeconds") return { ...r, restSeconds: value };
        return value === null ? r : { ...r, [field]: value };
      })
    );
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setStep("intensity");
      setRows([]);
      setActiveId(null);
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <Button size={size} className={className} disabled={startSession.isPending}>
          <Play className="mr-1 h-4 w-4" />
          {label}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          {step === "intensity" ? (
            <>
              <DrawerHeader className="text-left">
                <DrawerTitle>How hard today?</DrawerTitle>
                <DrawerDescription>Sets how the app suggests your loads this session.</DrawerDescription>
              </DrawerHeader>
              <div className="grid gap-2 p-4">
                <Button
                  variant="outline"
                  className="h-auto justify-start gap-3 py-3"
                  onClick={() => chooseIntensity("normal")}
                  disabled={startSession.isPending}
                >
                  <Gauge className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="text-left">
                    <span className="block font-medium">Normal</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      Steady progression: add a rep, then weight.
                    </span>
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto justify-start gap-3 py-3"
                  onClick={() => chooseIntensity("hard")}
                  disabled={startSession.isPending}
                >
                  <Flame className="h-5 w-5 shrink-0 text-orange-500" />
                  <span className="text-left">
                    <span className="block font-medium">Push hard</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      Bigger jumps: go for a PR.
                    </span>
                  </span>
                </Button>
              </div>
              <DrawerFooter className="pt-0" />
            </>
          ) : (
            <>
              <DrawerHeader className="text-left">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="-ml-2 h-8 w-8 shrink-0"
                    aria-label="Back to intensity"
                    onClick={() => setStep("intensity")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <DrawerTitle>Today&apos;s plan</DrawerTitle>
                </div>
                <DrawerDescription>
                  Drag to reorder, tune sets and rest, or just start as planned.
                </DrawerDescription>
              </DrawerHeader>

              <div className="max-h-[50vh] overflow-y-auto px-4">
                {preview.isPending ? (
                  <div className="flex justify-center py-10">
                    <Spinner />
                  </div>
                ) : rows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No exercises for this program yet. Start anyway and add them as you go.
                  </p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
                    onDragCancel={() => setActiveId(null)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="space-y-2 pb-2">
                      {rows.map((row) => (
                        <DraggablePlanRow
                          key={row.exerciseId}
                          row={row}
                          onChange={(field, value) => updateRow(row.exerciseId, field, value)}
                        />
                      ))}
                    </div>
                    <DragOverlay>
                      {activeRow ? <PlanRowCard row={activeRow} dragging /> : null}
                    </DragOverlay>
                  </DndContext>
                )}
              </div>

              <DrawerFooter className="gap-2 pt-3">
                <Button
                  className="h-12 w-full"
                  disabled={startSession.isPending || preview.isPending}
                  onClick={() => void start(intensity, rows.length > 0 ? rows : undefined)}
                >
                  <Play className="mr-1 h-5 w-5" />
                  Start as planned
                </Button>
                {isSmart ? (
                  <Button
                    variant="outline"
                    className="h-11 w-full"
                    disabled={preview.isPending || startSession.isPending}
                    onClick={regenerate}
                  >
                    <RefreshCw className={cn("mr-1 h-4 w-4", preview.isPending && "animate-spin")} />
                    Regenerate picks
                  </Button>
                ) : null}
              </DrawerFooter>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
