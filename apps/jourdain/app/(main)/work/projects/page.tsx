"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ChevronDown,
  FolderKanban,
  Pencil,
  Plus,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Progress } from "@workspace/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { PageHeader } from "@/components/page-header";
import { TaskRow } from "@/components/molecules/task-row";
import { TaskDetailDialog } from "@/components/organisms/task-detail-dialog";
import {
  PROJECT_COLORS,
  type Project,
  type ProjectStatus,
} from "@/entities/projects/model/types";
import type { Task } from "@/entities/tasks/model/types";
import {
  useCreateProject,
  useProjects,
  useUpdateProject,
} from "@/hooks/projects/use-projects";
import {
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask,
} from "@/hooks/tasks/use-tasks";
import {
  EMPTY_PROJECT_STATS,
  projectTaskStats,
  type ProjectTaskStats,
} from "@/lib/projects/stats";

const STATUS_META: Record<
  ProjectStatus,
  { label: string; badgeClass: string }
> = {
  active: {
    label: "Active",
    badgeClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  paused: {
    label: "Paused",
    badgeClass:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  done: {
    label: "Done",
    badgeClass:
      "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  archived: {
    label: "Archived",
    badgeClass: "border-border bg-muted text-muted-foreground",
  },
};

const DIALOG_STATUSES: ProjectStatus[] = ["active", "paused", "done"];

export default function WorkProjectsPage() {
  const { data: projects, isLoading, error } = useProjects();
  const { data: tasks } = useTasks();
  const updateProject = useUpdateProject();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const all = useMemo(() => projects ?? [], [projects]);
  // One pass over the task list instead of a full scan per project card.
  const statsByProject = useMemo(() => projectTaskStats(tasks), [tasks]);
  const activeProjects = all.filter((p) => p.status === "active");
  const pausedProjects = all.filter((p) => p.status === "paused");
  const doneProjects = all.filter((p) => p.status === "done");

  const selectedTask = tasks?.find((task) => task.id === selectedTaskId) ?? null;

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(project: Project) {
    setEditing(project);
    setDialogOpen(true);
  }

  function renderCard(project: Project) {
    return (
      <ProjectCard
        key={project.id}
        project={project}
        stats={statsByProject.get(project.id) ?? EMPTY_PROJECT_STATS}
        expanded={expandedId === project.id}
        onToggleExpand={() =>
          setExpandedId((current) =>
            current === project.id ? null : project.id
          )
        }
        onEdit={() => openEdit(project)}
        onArchive={() => setArchiveTarget(project)}
        onOpenTask={(task) => setSelectedTaskId(task.id)}
      />
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Projects"
        icon={<FolderKanban className="h-5 w-5" />}
        actions={
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        }
      />

      {error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : null}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-14 text-center">
          <FolderKanban className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No projects yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Group work tasks into projects to track progress and momentum in
            one place.
          </p>
          <Button size="sm" className="mt-2 gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {[...activeProjects, ...pausedProjects].length > 0 ? (
            <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...activeProjects, ...pausedProjects].map(renderCard)}
            </div>
          ) : null}

          {doneProjects.length > 0 ? (
            <div className="space-y-3">
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setShowDone((value) => !value)}
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    !showDone && "-rotate-90"
                  )}
                />
                Done ({doneProjects.length})
              </button>
              {showDone ? (
                <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {doneProjects.map(renderCard)}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />

      <AlertDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Archive {archiveTarget?.name ?? "project"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The project disappears from this page. Its tasks stay in your
              task list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (archiveTarget) {
                  updateProject.mutate({
                    projectId: archiveTarget.id,
                    input: { status: "archived" },
                  });
                }
                setArchiveTarget(null);
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TaskDetailDialog
        task={selectedTask}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
      />
    </section>
  );
}

function ProjectCard({
  project,
  stats,
  expanded,
  onToggleExpand,
  onEdit,
  onArchive,
  onOpenTask,
}: {
  project: Project;
  stats: ProjectTaskStats;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onOpenTask: (task: Task) => void;
}) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [quickTitle, setQuickTitle] = useState("");

  const total = stats.open + stats.done;
  const percent = total === 0 ? 0 : Math.round((stats.done / total) * 100);
  const openTasks = stats.openTasks;
  const meta = STATUS_META[project.status];

  function handleQuickAdd() {
    const trimmed = quickTitle.trim();
    if (!trimmed || createTask.isPending) return;
    createTask.mutate(
      { title: trimmed, projectId: project.id, domains: ["work"] },
      { onSuccess: () => setQuickTitle("") }
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpand}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggleExpand();
          }
        }}
        className="group cursor-pointer space-y-3 p-4"
      >
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden
            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: project.color ?? "#64748b" }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{project.name}</p>
            {project.description ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {project.description}
              </p>
            ) : null}
          </div>
          <Badge variant="outline" className={cn("shrink-0", meta.badgeClass)}>
            {meta.label}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <Progress value={percent} className="h-1.5" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {stats.open} open · {stats.done} done
            </span>
            <span>{percent}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              aria-label={`Edit "${project.name}"`}
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              aria-label={`Archive "${project.name}"`}
              onClick={(event) => {
                event.stopPropagation();
                onArchive();
              }}
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="tasks"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-border/60 p-3">
              {openTasks.map((task) => (
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
                  onOpen={onOpenTask}
                />
              ))}
              {openTasks.length === 0 ? (
                <p className="px-1 py-2 text-center text-xs text-muted-foreground">
                  No open tasks in this project.
                </p>
              ) : null}
              <form
                className="flex items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleQuickAdd();
                }}
              >
                <Input
                  value={quickTitle}
                  onChange={(event) => setQuickTitle(event.target.value)}
                  placeholder="Add a task to this project…"
                  className="h-8 text-sm"
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 shrink-0"
                  aria-label={`Add task to "${project.name}"`}
                  disabled={!quickTitle.trim() || createTask.isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ProjectDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Project | null;
}) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(PROJECT_COLORS[0]);
  const [status, setStatus] = useState<ProjectStatus>("active");

  const formKey = `${open ? "open" : "closed"}:${editing?.id ?? "new"}`;
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (open && formKey !== lastKey) {
    setLastKey(formKey);
    setName(editing?.name ?? "");
    setDescription(editing?.description ?? "");
    setColor(editing?.color ?? PROJECT_COLORS[0]);
    setStatus(editing?.status ?? "active");
  }
  if (!open && lastKey !== null) setLastKey(null);

  const pending = createProject.isPending || updateProject.isPending;
  const error = createProject.error ?? updateProject.error;
  const canSave = name.trim().length > 0 && !pending;

  function handleSubmit() {
    if (!canSave) return;
    const input = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      status,
    };
    if (editing) {
      updateProject.mutate(
        { projectId: editing.id, input },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createProject.mutate(input, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit project" : "New project"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Website relaunch"
            autoFocus
          />

          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description (optional)"
            rows={3}
          />

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Color</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  aria-label={`Color ${swatch}`}
                  aria-pressed={color === swatch}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    color === swatch
                      ? "scale-110 border-foreground"
                      : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as ProjectStatus)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIALOG_STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {STATUS_META[option].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={!canSave}>
              {pending
                ? "Saving…"
                : editing
                  ? "Save changes"
                  : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
