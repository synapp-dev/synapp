"use client";

import { useState } from "react";
import { Flag, Plus } from "lucide-react";
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
import type { Task, TaskPriority } from "@/entities/tasks/model/types";

// datetime-local is in the browser's local time; the API stores ISO/UTC.
function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function TasksPage() {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(4);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: tasks, isLoading, error } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const openTasks = tasks?.filter((task) => task.status === "open") ?? [];
  const doneTasks = tasks?.filter((task) => task.status === "done") ?? [];
  const selectedTask =
    tasks?.find((task) => task.id === selectedTaskId) ?? null;

  function handleCreate() {
    const trimmed = title.trim();
    if (!trimmed || createTask.isPending) return;
    createTask.mutate(
      {
        title: trimmed,
        dueDate: dueDate || null,
        remindAt: localInputToIso(remindAt),
        priority,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDueDate("");
          setRemindAt("");
          setPriority(4);
        },
      },
    );
  }

  function handleToggle(task: Task) {
    updateTask.mutate({
      taskId: task.id,
      input: { status: task.status === "open" ? "done" : "open" },
    });
  }

  function handleDelete(task: Task) {
    deleteTask.mutate(task.id);
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground text-sm">
          {isLoading
            ? "Loading..."
            : `${openTasks.length} open${doneTasks.length ? `, ${doneTasks.length} done` : ""}`}
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
          placeholder="Add a task..."
          className="min-w-[12rem] flex-1"
        />
        <Input
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          className="w-40"
          aria-label="Due date"
        />
        <Input
          type="datetime-local"
          value={remindAt}
          onChange={(event) => setRemindAt(event.target.value)}
          className="w-52"
          aria-label="Reminder time"
          title="Push a notification at this time"
        />
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

      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {openTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onOpen={(opened) => setSelectedTaskId(opened.id)}
              />
            ))}
            {openTasks.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No open tasks. Add one above, or ask the Agent.
              </p>
            ) : null}
          </div>

          {doneTasks.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                Completed
              </h2>
              {doneTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onOpen={(opened) => setSelectedTaskId(opened.id)}
                />
              ))}
            </div>
          ) : null}
        </>
      )}

      <TaskDetailDialog
        task={selectedTask}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
      />
    </section>
  );
}
