"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck2,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";
import { format, isToday, parseISO, startOfDay } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { PageHeader } from "@/components/page-header";
import { TaskRow } from "@/components/molecules/task-row";
import { TaskDetailDialog } from "@/components/organisms/task-detail-dialog";
import { GymTodayCard } from "@/components/dashboard/gym-today-card";
import { PillarScorecard } from "@/components/dashboard/pillar-scorecard";
import { TouchBaseCard } from "@/components/dashboard/touch-base-card";
import { useTasks, useUpdateTask } from "@/hooks/tasks/use-tasks";
import { scoreQueryKey } from "@/hooks/scoring/use-score";
import { useCheckin } from "@/hooks/checkin/use-checkin";
import { useCheckinStore } from "@/entities/checkin/model/store";
import type { Task } from "@/entities/tasks/model/types";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const section: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

// Groups the right-hand task sections so they cascade after the pillar card.
const taskColumn: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.09 } },
};

function TasksSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

function GroupLabel({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "destructive";
}) {
  return (
    <p
      className={
        tone === "destructive"
          ? "text-xs font-medium uppercase tracking-wider text-destructive"
          : "text-xs font-medium uppercase tracking-wider text-muted-foreground"
      }
    >
      {children}
    </p>
  );
}

export default function DashboardPage() {
  const { data: tasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const queryClient = useQueryClient();
  const { data: checkin } = useCheckin();
  const openWizard = useCheckinStore((state) => state.openWizard);
  const unresolvedCount =
    checkin?.groups.reduce((count, group) => count + group.items.length, 0) ??
    0;
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
    (task) =>
      task.dueDate &&
      parseISO(task.dueDate) < today &&
      !isToday(parseISO(task.dueDate)),
  );
  const upNext = openTasks
    .filter((task) => !dueToday.includes(task) && !overdue.includes(task))
    .slice(0, 5);

  function handleToggle(task: Task) {
    updateTask.mutate(
      {
        taskId: task.id,
        input: { status: task.status === "open" ? "done" : "open" },
      },
      {
        // Completions move the ring, so refresh the score straight away.
        onSettled: () =>
          queryClient.invalidateQueries({ queryKey: scoreQueryKey }),
      },
    );
  }

  const needsAttention = overdue.length + dueToday.length;

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title={format(new Date(), "EEEE, d MMMM")}
        subtitle={
          isLoading
            ? "Loading..."
            : needsAttention > 0
              ? `${needsAttention} task${needsAttention === 1 ? "" : "s"} need attention today`
              : "Nothing urgent on the books"
        }
        actions={
          <>
            {unresolvedCount > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={openWizard}
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                Check in
                <span className="rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold tabular-nums text-primary">
                  {unresolvedCount}
                </span>
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/agent">
                <Sparkles className="h-3.5 w-3.5" />
                Ask the Agent
              </Link>
            </Button>
          </>
        }
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start"
      >
        <motion.div variants={section} className="lg:sticky lg:top-6">
          <PillarScorecard />
        </motion.div>

        <motion.div variants={taskColumn} className="space-y-4">
        <motion.div variants={section}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
                Today&apos;s plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <GymTodayCard />

              {isLoading ? (
                <TasksSkeleton />
              ) : (
                <>
                  {overdue.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <GroupLabel tone="destructive">
                          Needs a decision
                        </GroupLabel>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                          onClick={openWizard}
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          Review now
                        </Button>
                      </div>
                      {overdue.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          onToggle={handleToggle}
                          onOpen={openTask}
                        />
                      ))}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <GroupLabel>Due today</GroupLabel>
                    {dueToday.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                        Nothing scheduled today.
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
                  </div>

                  {upNext.length > 0 ? (
                    <div className="space-y-2">
                      <GroupLabel>Up next</GroupLabel>
                      {upNext.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          onToggle={handleToggle}
                          onOpen={openTask}
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={section}>
          <TouchBaseCard />
        </motion.div>

        <motion.div variants={section}>
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
        </motion.div>
        </motion.div>
      </motion.div>

      <TaskDetailDialog
        task={selectedTask}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
      />
    </section>
  );
}
