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
import { CalendarDays, Flag, Plus } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { PRIORITY_OPTIONS, TaskRow } from "@/components/molecules/task-row";
import { TaskDetailDialog } from "@/components/organisms/task-detail-dialog";
import {
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask,
} from "@/hooks/tasks/use-tasks";
import type { Task, TaskDomain, TaskPriority } from "@/entities/tasks/model/types";

const UNSORTED = "unsorted" as const;
type ColumnKey = TaskDomain | typeof UNSORTED;

const COLUMNS: { key: ColumnKey; label: string; dot: string }[] = [
  { key: UNSORTED, label: "Unsorted", dot: "bg-muted-foreground/40" },
  { key: "identity", label: "Identity", dot: "bg-violet-500" },
  { key: "health", label: "Health", dot: "bg-emerald-500" },
  { key: "work", label: "Work", dot: "bg-blue-500" },
  { key: "social", label: "Social", dot: "bg-amber-500" },
  { key: "finance", label: "Finance", dot: "bg-rose-500" },
];
const PILLAR_KEYS = new Set<string>([
  "identity",
  "health",
  "work",
  "social",
  "finance",
]);

function columnOf(task: Task): ColumnKey {
  const first = task.domains[0];
  return first && PILLAR_KEYS.has(first) ? (first as TaskDomain) : UNSORTED;
}

function priorityFlagClass(priority: TaskPriority): string {
  return (
    PRIORITY_OPTIONS.find((option) => option.value === priority)?.flagClass ?? ""
  );
}

export default function TasksPage() {
  const [title, setTitle] = useState("");
  const [pillar, setPillar] = useState<ColumnKey>(UNSORTED);
  const [priority, setPriority] = useState<TaskPriority>(4);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [view, setView] = useState<"today" | "board">("today");

  const { data: tasks, isLoading, error } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 160, tolerance: 6 },
    })
  );

  const openTasks = useMemo(
    () => tasks?.filter((task) => task.status === "open") ?? [],
    [tasks]
  );
  const doneTasks = useMemo(
    () => tasks?.filter((task) => task.status === "done") ?? [],
    [tasks]
  );

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);
  const todayTasks = useMemo(
    () =>
      openTasks
        .filter((task) => task.dueDate && task.dueDate <= todayStr)
        .sort((a, b) => a.priority - b.priority),
    [openTasks, todayStr]
  );

  const byColumn = useMemo(() => {
    const map = new Map<ColumnKey, Task[]>();
    for (const column of COLUMNS) map.set(column.key, []);
    for (const task of openTasks) map.get(columnOf(task))?.push(task);
    for (const list of map.values()) {
      list.sort((a, b) => a.priority - b.priority);
    }
    return map;
  }, [openTasks]);

  const selectedTask =
    tasks?.find((task) => task.id === selectedTaskId) ?? null;
  const activeTask = openTasks.find((task) => task.id === activeId) ?? null;

  function handleCreate() {
    const trimmed = title.trim();
    if (!trimmed || createTask.isPending) return;
    createTask.mutate(
      {
        title: trimmed,
        priority,
        domains: pillar === UNSORTED ? [] : [pillar],
      },
      { onSuccess: () => setTitle("") }
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const overKey = event.over?.id as ColumnKey | undefined;
    if (!overKey) return;
    const task = openTasks.find((item) => item.id === event.active.id);
    if (!task || columnOf(task) === overKey) return;
    updateTask.mutate({
      taskId: task.id,
      input: { domains: overKey === UNSORTED ? [] : [overKey] },
    });
  }

  return (
    <section className="w-full space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Loading…"
            : view === "today"
              ? `${todayTasks.length} due today`
              : `${openTasks.length} open`}
        </p>
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          handleCreate();
        }}
      >
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a task…"
          className="min-w-[12rem] flex-1"
        />
        <Select
          value={pillar}
          onValueChange={(value) => setPillar(value as ColumnKey)}
        >
          <SelectTrigger className="w-36" aria-label="Pillar">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLUMNS.map((column) => (
              <SelectItem key={column.key} value={column.key}>
                {column.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(priority)}
          onValueChange={(value) => setPriority(Number(value) as TaskPriority)}
        >
          <SelectTrigger className="w-36" aria-label="Priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                <span className="flex items-center gap-2">
                  <Flag className={cn("h-3.5 w-3.5", option.flagClass)} />
                  {option.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="submit"
          size="icon"
          disabled={!title.trim() || createTask.isPending}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      {error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : null}

      <div className="inline-flex rounded-lg border border-border/60 p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setView("today")}
          className={cn(
            "rounded-md px-3 py-1 transition-colors",
            view === "today"
              ? "bg-muted font-medium"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setView("board")}
          className={cn(
            "rounded-md px-3 py-1 transition-colors",
            view === "board"
              ? "bg-muted font-medium"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Board
        </button>
      </div>

      {isLoading ? (
        <div className="flex gap-3">
          <Skeleton className="h-64 w-64" />
          <Skeleton className="h-64 w-64" />
          <Skeleton className="h-64 w-64" />
        </div>
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
            {COLUMNS.map((column) => (
              <Column
                key={column.key}
                columnKey={column.key}
                label={column.label}
                dot={column.dot}
                tasks={byColumn.get(column.key) ?? []}
                onOpen={(task) => setSelectedTaskId(task.id)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} dragging /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="space-y-2">
          {todayTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={(item) =>
                updateTask.mutate({
                  taskId: item.id,
                  input: { status: "done" },
                })
              }
              onDelete={(item) => deleteTask.mutate(item.id)}
              onOpen={(item) => setSelectedTaskId(item.id)}
            />
          ))}
          {todayTasks.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Nothing due today. 🎉
            </p>
          ) : null}
        </div>
      )}

      {doneTasks.length > 0 ? (
        <div className="space-y-2">
          <button
            type="button"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setShowDone((value) => !value)}
          >
            {showDone ? "Hide" : "Show"} completed ({doneTasks.length})
          </button>
          {showDone ? (
            <div className="space-y-2">
              {doneTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={(item) =>
                    updateTask.mutate({
                      taskId: item.id,
                      input: { status: "open" },
                    })
                  }
                  onDelete={(item) => deleteTask.mutate(item.id)}
                  onOpen={(item) => setSelectedTaskId(item.id)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <TaskDetailDialog
        task={selectedTask}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
      />
    </section>
  );
}

function Column({
  columnKey,
  label,
  dot,
  tasks,
  onOpen,
}: {
  columnKey: ColumnKey;
  label: string;
  dot: string;
  tasks: Task[];
  onOpen: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col rounded-xl border border-border/60 bg-muted/20 p-2 transition-colors",
        isOver && "border-primary/60 bg-primary/5"
      )}
    >
      <div className="flex items-center gap-2 px-1 pb-2">
        <span className={cn("h-2 w-2 rounded-full", dot)} />
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="flex min-h-16 flex-1 flex-col gap-2">
        {tasks.map((task) => (
          <DraggableCard key={task.id} task={task} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({
  task,
  onOpen,
}: {
  task: Task;
  onOpen: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
      }}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(task)}
    >
      <TaskCard task={task} />
    </div>
  );
}

function TaskCard({ task, dragging }: { task: Task; dragging?: boolean }) {
  return (
    <div
      className={cn(
        "cursor-grab touch-none rounded-lg border border-border/60 bg-card p-2.5 text-left shadow-sm active:cursor-grabbing",
        dragging && "rotate-2 shadow-lg"
      )}
    >
      <p className="text-sm leading-snug">{task.title}</p>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <Flag className={cn("h-3 w-3", priorityFlagClass(task.priority))} />
        {task.dueDate ? (
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {task.dueDate.slice(5)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
