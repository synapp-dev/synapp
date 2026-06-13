"use client";

import {
  Briefcase,
  Calendar,
  Fingerprint,
  HeartPulse,
  Inbox,
  PiggyBank,
  Trash2,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  differenceInCalendarDays,
  format,
  isPast,
  isToday,
  isTomorrow,
  parseISO,
  startOfDay,
} from "date-fns";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { cn } from "@workspace/ui/lib/utils";
import type { Task, TaskDomain, TaskPriority } from "@/entities/tasks/model/types";

type TaskRowProps = {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onOpen?: (task: Task) => void;
};

export const DOMAIN_CONFIG: Record<
  TaskDomain,
  { label: string; icon: LucideIcon }
> = {
  identity: { label: "Identity", icon: Fingerprint },
  health: { label: "Health", icon: HeartPulse },
  work: { label: "Work", icon: Briefcase },
  social: { label: "Social", icon: Users },
  finance: { label: "Finance", icon: PiggyBank },
};

export const PRIORITY_OPTIONS: {
  value: TaskPriority;
  label: string;
  flagClass: string;
}[] = [
  { value: 1, label: "P1 · Urgent", flagClass: "text-red-500" },
  { value: 2, label: "P2 · High", flagClass: "text-orange-400" },
  { value: 3, label: "P3 · Medium", flagClass: "text-blue-500" },
  { value: 4, label: "P4 · Normal", flagClass: "text-muted-foreground" },
];

// Todoist-style priority ring colors: P1 red, P2 orange, P3 blue, P4 neutral.
export const PRIORITY_CHECKBOX: Record<TaskPriority, string> = {
  1: "border-red-500 data-[state=checked]:border-red-500 data-[state=checked]:bg-red-500",
  2: "border-orange-400 data-[state=checked]:border-orange-400 data-[state=checked]:bg-orange-400",
  3: "border-blue-500 data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500",
  4: "border-muted-foreground/40 data-[state=checked]:border-muted-foreground/40 data-[state=checked]:bg-muted-foreground/40",
};

function dueMeta(dueDate: string): { label: string; className: string } {
  const date = parseISO(dueDate);
  if (isToday(date)) {
    return { label: "Today", className: "text-emerald-500" };
  }
  if (isTomorrow(date)) {
    return { label: "Tomorrow", className: "text-violet-500" };
  }
  if (isPast(startOfDay(date))) {
    return { label: format(date, "EEE d MMM"), className: "text-red-500" };
  }
  if (differenceInCalendarDays(date, new Date()) < 7) {
    return { label: format(date, "EEEE"), className: "text-violet-500" };
  }
  return { label: format(date, "EEE d MMM"), className: "text-muted-foreground" };
}

export function TaskRow({ task, onToggle, onDelete, onOpen }: TaskRowProps) {
  const done = task.status === "done";
  const due = task.dueDate && !done ? dueMeta(task.dueDate) : null;

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm transition-colors hover:border-border",
        onOpen && "cursor-pointer",
      )}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen ? () => onOpen(task) : undefined}
      onKeyDown={
        onOpen
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(task);
              }
            }
          : undefined
      }
    >
      <span
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Checkbox
          checked={done}
          onCheckedChange={() => onToggle(task)}
          aria-label={done ? `Reopen "${task.title}"` : `Complete "${task.title}"`}
          className={cn(
            "mt-0.5 h-[18px] w-[18px] rounded-full border-2 data-[state=checked]:text-white",
            PRIORITY_CHECKBOX[task.priority],
          )}
        />
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm",
            done ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {task.title}
        </p>
        {due || task.notes ? (
          <div className="mt-0.5 flex items-center gap-3 text-xs">
            {due ? (
              <span className={cn("flex items-center gap-1", due.className)}>
                <Calendar className="h-3 w-3" />
                {due.label}
              </span>
            ) : null}
            {task.notes ? (
              <span className="truncate text-muted-foreground">
                {task.notes}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2.5 pt-0.5 text-xs text-muted-foreground">
        {task.domains.length === 0 ? (
          <span className="flex items-center gap-1">
            Inbox
            <Inbox className="h-3.5 w-3.5" />
          </span>
        ) : (
          task.domains.map((domain) => {
            const config = DOMAIN_CONFIG[domain];
            const DomainIcon = config.icon;
            return (
              <span key={domain} className="flex items-center gap-1">
                {config.label}
                <DomainIcon className="h-3.5 w-3.5" />
              </span>
            );
          })
        )}
      </div>

      {onDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          aria-label={`Delete "${task.title}"`}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(task);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
