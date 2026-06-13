"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { format, isToday, parseISO, startOfDay } from "date-fns";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { TaskRow } from "@/components/molecules/task-row";
import { TaskDetailDialog } from "@/components/organisms/task-detail-dialog";
import {
  isTouchOverdue,
  lastTouchLabel,
  personInitials,
} from "@/components/molecules/person-card";
import { useTasks, useUpdateTask } from "@/hooks/tasks/use-tasks";
import { usePeople, useUpdatePerson } from "@/hooks/people/use-people";
import type { Task } from "@/entities/tasks/model/types";

export default function DashboardPage() {
  const { data: tasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const { data: people } = usePeople();
  const updatePerson = useUpdatePerson();
  const touchBaseDue = (people ?? []).filter(isTouchOverdue);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask =
    tasks?.find((task) => task.id === selectedTaskId) ?? null;
  const openTask = (task: Task) => setSelectedTaskId(task.id);

  const openTasks = tasks?.filter((task) => task.status === "open") ?? [];
  const today = startOfDay(new Date());

  const dueToday = openTasks.filter(
    (task) => task.dueDate && isToday(parseISO(task.dueDate)),
  );
  const overdue = openTasks.filter(
    (task) => task.dueDate && parseISO(task.dueDate) < today && !isToday(parseISO(task.dueDate)),
  );
  const upNext = openTasks
    .filter((task) => !dueToday.includes(task) && !overdue.includes(task))
    .slice(0, 5);

  function handleToggle(task: Task) {
    updateTask.mutate({
      taskId: task.id,
      input: { status: task.status === "open" ? "done" : "open" },
    });
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {format(new Date(), "EEEE, d MMMM")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isLoading
              ? "Loading..."
              : overdue.length + dueToday.length > 0
                ? `${overdue.length + dueToday.length} task${overdue.length + dueToday.length === 1 ? "" : "s"} need attention today`
                : "Nothing urgent on the books"}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/agent">
            <Sparkles className="h-3.5 w-3.5" />
            Ask the Agent
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {overdue.length > 0 ? (
            <Card className="border-destructive/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Overdue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {overdue.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onOpen={openTask}
                  />
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Due today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dueToday.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing due today.
                </p>
              ) : (
                dueToday.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onOpen={openTask}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {upNext.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Up next</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upNext.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onOpen={openTask}
                  />
                ))}
              </CardContent>
            </Card>
          ) : null}

          {touchBaseDue.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Touch base</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {touchBaseDue.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center gap-3 rounded-md border border-border/60 bg-card px-3 py-2"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {personInitials(person)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">
                        {person.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last contact {lastTouchLabel(person)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        updatePerson.mutate({
                          personId: person.id,
                          input: { lastTouchAt: new Date().toISOString() },
                        })
                      }
                    >
                      Log touch
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
          >
            <Link href="/tasks">
              All tasks
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
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
