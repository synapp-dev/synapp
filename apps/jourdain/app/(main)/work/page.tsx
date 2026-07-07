"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  FolderKanban,
  ListTodo,
} from "lucide-react";
import { isAfter, parseISO, startOfWeek } from "date-fns";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { PageHeader } from "@/components/page-header";
import { TaskRow } from "@/components/molecules/task-row";
import { TaskDetailDialog } from "@/components/organisms/task-detail-dialog";
import type { Task } from "@/entities/tasks/model/types";
import { useProjects } from "@/hooks/projects/use-projects";
import {
  useDeleteTask,
  useTasks,
  useUpdateTask,
} from "@/hooks/tasks/use-tasks";
import { EMPTY_PROJECT_STATS, projectTaskStats } from "@/lib/projects/stats";

function isWorkTask(task: Task): boolean {
  return task.domains.includes("work") || task.projectId !== null;
}

export default function WorkPage() {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const isLoading = projectsLoading || tasksLoading;

  const activeProjects = useMemo(
    () => (projects ?? []).filter((project) => project.status === "active"),
    [projects]
  );
  const workTasks = useMemo(() => (tasks ?? []).filter(isWorkTask), [tasks]);
  const statsByProject = useMemo(() => projectTaskStats(tasks), [tasks]);
  const openWorkTasks = useMemo(
    () => workTasks.filter((task) => task.status === "open"),
    [workTasks]
  );
  const doneThisWeek = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return workTasks.filter(
      (task) =>
        task.status === "done" &&
        task.completedAt !== null &&
        isAfter(parseISO(task.completedAt), weekStart)
    ).length;
  }, [workTasks]);

  const recentTasks = useMemo(
    () =>
      [...openWorkTasks]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6),
    [openWorkTasks]
  );

  const selectedTask = tasks?.find((task) => task.id === selectedTaskId) ?? null;

  const stats = [
    {
      label: "Active projects",
      value: activeProjects.length,
      icon: FolderKanban,
    },
    { label: "Open work tasks", value: openWorkTasks.length, icon: ListTodo },
    { label: "Done this week", value: doneThisWeek, icon: CheckCircle2 },
  ];

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Work"
        icon={<Briefcase className="h-5 w-5" />}
        subtitle="Projects, tasks, and the momentum behind them."
      />

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Projects</h2>
              <Button asChild variant="ghost" size="sm" className="gap-1">
                <Link href="/work/projects">
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            {activeProjects.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center">
                <FolderKanban className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No active projects. Start one to group your work tasks.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-1">
                  <Link href="/work/projects">Go to projects</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeProjects.slice(0, 6).map((project) => {
                  const { open, done } =
                    statsByProject.get(project.id) ?? EMPTY_PROJECT_STATS;
                  const total = done + open;
                  const percent =
                    total === 0 ? 0 : Math.round((done / total) * 100);
                  return (
                    <Link key={project.id} href="/work/projects">
                      <Card className="transition-colors hover:border-border">
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-center gap-2">
                            <span
                              aria-hidden
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: project.color ?? "#64748b",
                              }}
                            />
                            <p className="truncate text-sm font-medium">
                              {project.name}
                            </p>
                          </div>
                          <Progress value={percent} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">
                            {open} open · {done} done
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-medium">Recent work tasks</h2>
            {recentTasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No open work tasks. Nice and clear.
              </p>
            ) : (
              <div className="space-y-2">
                {recentTasks.map((task) => (
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
              </div>
            )}
          </div>
        </motion.div>
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
