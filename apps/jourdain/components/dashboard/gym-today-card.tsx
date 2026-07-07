"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CheckCircle2, Dumbbell, Play } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import {
  useActiveSession,
  useSchedule,
  useSessions,
} from "@/hooks/gym/use-gym";

function groupLabel(group: string): string {
  return group
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Today's scheduled program with a Start / Resume / done state. Renders
 *  nothing on rest days. */
export function GymTodayCard() {
  const { data: schedule, isLoading: scheduleLoading } = useSchedule();
  const { data: activeSession, isLoading: activeLoading } = useActiveSession();
  const { data: sessions } = useSessions();

  if (scheduleLoading || activeLoading) {
    return <Skeleton className="h-[72px] w-full rounded-xl" />;
  }

  const today = schedule?.days[new Date().getDay()];
  if (!today?.programId) return null;

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const completedToday = (sessions ?? []).some(
    (session) =>
      session.status === "completed" && session.performedOn === todayStr
  );
  const hasActive = !!activeSession;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3",
        completedToday
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border/60 bg-gradient-to-r from-emerald-500/10 to-transparent"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          completedToday
            ? "bg-emerald-500/15 text-emerald-500"
            : "bg-emerald-500/10 text-emerald-500"
        )}
      >
        {completedToday ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <Dumbbell className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {today.programName ?? "Training day"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {completedToday
            ? "Session done. Nice work."
            : today.muscleGroups.length > 0
              ? today.muscleGroups.map(groupLabel).join(" · ")
              : "Scheduled for today"}
        </p>
      </div>

      {completedToday ? (
        <span className="shrink-0 text-xs font-medium text-emerald-500">
          Completed
        </span>
      ) : (
        <Button asChild size="sm" className="shrink-0 gap-1.5">
          <Link href="/health/gym">
            <Play className="h-3.5 w-3.5" />
            {hasActive ? "Resume" : "Start"}
          </Link>
        </Button>
      )}
    </div>
  );
}
