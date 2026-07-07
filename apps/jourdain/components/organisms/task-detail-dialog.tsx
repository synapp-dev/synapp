"use client";

import { useState } from "react";
import { Flag, Trash2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import {
  DOMAIN_CONFIG,
  PRIORITY_CHECKBOX,
  PRIORITY_OPTIONS,
} from "@/components/molecules/task-row";
import {
  TASK_DOMAINS,
  type Task,
  type TaskDomain,
  type TaskPriority,
} from "@/entities/tasks/model/types";
import { useDeleteTask, useUpdateTask } from "@/hooks/tasks/use-tasks";
import { useProjects } from "@/hooks/projects/use-projects";

type TaskDetailDialogProps = {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
};

export function TaskDetailDialog({ task, onOpenChange }: TaskDetailDialogProps) {
  return (
    <Dialog open={task !== null} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogTitle className="sr-only">Task details</DialogTitle>
        {task ? (
          <TaskEditor
            key={task.id}
            task={task}
            close={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// datetime-local works in the browser's local time; the API stores ISO/UTC.
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const NO_PROJECT = "none";

function TaskEditor({ task, close }: { task: Task; close: () => void }) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: projects } = useProjects();

  const projectOptions = (projects ?? []).filter(
    (project) =>
      project.status === "active" ||
      project.status === "paused" ||
      project.id === task.projectId
  );

  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const done = task.status === "done";

  function commitTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === task.title) {
      setTitle(task.title);
      return;
    }
    updateTask.mutate({ taskId: task.id, input: { title: trimmed } });
  }

  function commitNotes() {
    const value = notes.trim();
    if (value === (task.notes ?? "")) return;
    updateTask.mutate({ taskId: task.id, input: { notes: value || null } });
  }

  function toggleDomain(domain: TaskDomain) {
    const next = task.domains.includes(domain)
      ? task.domains.filter((d) => d !== domain)
      : [...task.domains, domain];
    updateTask.mutate({ taskId: task.id, input: { domains: next } });
  }

  return (
    <div className="grid sm:grid-cols-[1fr_220px]">
      <div className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={done}
            onCheckedChange={() =>
              updateTask.mutate({
                taskId: task.id,
                input: { status: done ? "open" : "done" },
              })
            }
            aria-label={done ? "Reopen task" : "Complete task"}
            className={cn(
              "mt-1.5 h-[18px] w-[18px] rounded-full border-2 data-[state=checked]:text-white",
              PRIORITY_CHECKBOX[task.priority],
            )}
          />
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            aria-label="Task title"
            className={cn(
              "border-0 px-0 text-lg font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent",
              done && "text-muted-foreground line-through",
            )}
          />
        </div>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={commitNotes}
          placeholder="Description"
          rows={6}
          className="resize-none border-border/60 text-sm"
        />
      </div>

      <div className="space-y-5 border-t border-border/60 bg-muted/30 px-5 py-6 text-sm sm:border-l sm:border-t-0">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Due date</p>
          <Input
            type="date"
            value={task.dueDate ?? ""}
            onChange={(event) =>
              updateTask.mutate({
                taskId: task.id,
                input: { dueDate: event.target.value || null },
              })
            }
            aria-label="Due date"
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Remind me</p>
          <Input
            type="datetime-local"
            value={isoToLocalInput(task.remindAt)}
            onChange={(event) =>
              updateTask.mutate({
                taskId: task.id,
                input: { remindAt: localInputToIso(event.target.value) },
              })
            }
            aria-label="Reminder time"
            className="h-8 text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Pushes a notification at this time.
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Priority</p>
          <Select
            value={String(task.priority)}
            onValueChange={(value) =>
              updateTask.mutate({
                taskId: task.id,
                input: { priority: Number(value) as TaskPriority },
              })
            }
          >
            <SelectTrigger className="h-8 w-full text-xs" aria-label="Priority">
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
        </div>

        {projectOptions.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Project</p>
            <Select
              value={task.projectId ?? NO_PROJECT}
              onValueChange={(value) =>
                updateTask.mutate({
                  taskId: task.id,
                  input: { projectId: value === NO_PROJECT ? null : value },
                })
              }
            >
              <SelectTrigger className="h-8 w-full text-xs" aria-label="Project">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT}>No project</SelectItem>
                {projectOptions.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: project.color ?? "#64748b",
                        }}
                      />
                      {project.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Domains</p>
          <div className="flex flex-wrap gap-1.5">
            {TASK_DOMAINS.map((domain) => {
              const config = DOMAIN_CONFIG[domain];
              const DomainIcon = config.icon;
              const selected = task.domains.includes(domain);
              return (
                <button
                  key={domain}
                  type="button"
                  onClick={() => toggleDomain(domain)}
                  aria-pressed={selected}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    selected
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  <DomainIcon className="h-3 w-3" />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border/60 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={() => deleteTask.mutate(task.id, { onSuccess: close })}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete task
          </Button>
        </div>
      </div>
    </div>
  );
}
