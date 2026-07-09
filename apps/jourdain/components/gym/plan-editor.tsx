"use client";

import { useState } from "react";
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
import { GripVertical } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import {
  MUSCLE_SUBGROUP_LABELS,
  type SessionPreviewExercise,
} from "@/entities/gym/model/types";

export const WARMUP_OPTIONS = [0, 1, 2, 3];
export const WORKING_OPTIONS = [1, 2, 3, 4, 5, 6];
export const DROP_OPTIONS = [0, 1, 2, 3];
// null = auto (per-kind defaults), then 15s increments, 15s to 5min.
export const REST_OPTIONS = [null, ...Array.from({ length: 20 }, (_, i) => (i + 1) * 15)];

export type PlanField = "warmupSets" | "workingSets" | "dropSets" | "restSeconds";

function restLabel(seconds: number | null): string {
  if (seconds === null) return "Auto";
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  if (mm === 0) return `${ss}s`;
  return ss === 0 ? `${mm}m` : `${mm}m ${ss}s`;
}

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

export function PlanRowCard({
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

export function DraggablePlanRow({
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
 * The shared plan-editing surface: a drag-to-reorder list of exercise rows, each
 * with warm-up / working / drop / rest selects. `onChange` receives the fully
 * updated rows (order and per-row values) so both the program and ad-hoc wizards
 * render identical UI and own their own state.
 */
export function PlanEditor({
  rows,
  onChange,
}: {
  rows: SessionPreviewExercise[];
  onChange: (rows: SessionPreviewExercise[]) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeRow = rows.find((r) => r.exerciseId === activeId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } })
  );

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
    onChange(next);
  };

  const updateRow = (exerciseId: string, field: PlanField, value: number | null) => {
    onChange(
      rows.map((r) => {
        if (r.exerciseId !== exerciseId) return r;
        if (field === "restSeconds") return { ...r, restSeconds: value };
        return value === null ? r : { ...r, [field]: value };
      })
    );
  };

  return (
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
      <DragOverlay>{activeRow ? <PlanRowCard row={activeRow} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}
