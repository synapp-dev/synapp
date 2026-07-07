"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CalendarPlus, Dumbbell, History, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  useActiveSession,
  useExercises,
  usePrograms,
  useSchedule,
  useSessions,
} from "@/hooks/gym/use-gym";
import { useCreateTask } from "@/hooks/tasks/use-tasks";
import { StartSessionButton } from "@/components/gym/start-session-button";
import { formatDate } from "@/lib/format";
import { MUSCLE_GROUP_LABELS, type Program } from "@/entities/gym/model/types";
import { toast } from "sonner";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function ProgramCard({ program }: { program: Program }) {
  const createTask = useCreateTask();
  const addToTasks = () => {
    createTask.mutate(
      {
        title: `Gym: ${program.name}`,
        domains: ["health"],
        dueDate: format(new Date(), "yyyy-MM-dd"),
      },
      { onSuccess: () => toast.success("Added to today's tasks") }
    );
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{program.name}</p>
            <p className="text-xs text-muted-foreground">
              {program.exercises.length} exercise{program.exercises.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {program.muscleGroups.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {program.muscleGroups.map((m) => (
              <Badge key={m} variant="secondary" className="text-[10px]">
                {MUSCLE_GROUP_LABELS[m]}
              </Badge>
            ))}
          </div>
        ) : null}
        <div className="flex gap-2">
          <StartSessionButton programId={program.id} className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            onClick={addToTasks}
            disabled={createTask.isPending}
          >
            <CalendarPlus className="mr-1 h-4 w-4" />
            Tasks
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GymTodayPage() {
  const { data: programs } = usePrograms();
  const { data: exercises } = useExercises();
  const { data: schedule } = useSchedule();
  const { data: active } = useActiveSession();
  const { data: sessions } = useSessions();

  const today = new Date().getDay();
  const todayProgramId = schedule?.days[today]?.programId ?? null;
  const byId = new Map((programs ?? []).map((p) => [p.id, p]));
  const todays = todayProgramId && byId.has(todayProgramId) ? [byId.get(todayProgramId)!] : [];
  const others = (programs ?? []).filter((p) => p.id !== todayProgramId);

  const libraryEmpty = exercises != null && exercises.length === 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {active ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Workout in progress</p>
              <p className="truncate text-xs text-muted-foreground">{active.title}</p>
            </div>
            <Button size="sm" asChild>
              <Link href={`/health/gym/session/${active.id}`}>Resume</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {libraryEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <Dumbbell className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Set up your exercise library</p>
              <p className="text-sm text-muted-foreground">
                Load the Force USA G20 starter exercises to get going.
              </p>
            </div>
            <Button asChild>
              <Link href="/health/gym/exercises">Go to Exercises</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium tracking-tight">
          Today · {DAY_LABELS[today]}
        </h2>
        {todays.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {todays.map((p) => (
              <ProgramCard key={p.id} program={p} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <p className="text-sm text-muted-foreground">
                {todayProgramId
                  ? "Today's program is missing — set it again."
                  : "Rest day — nothing scheduled."}
              </p>
              <Button size="sm" variant="outline" asChild>
                <Link href="/health/gym/schedule">
                  <CalendarDays className="mr-1 h-4 w-4" />
                  Schedule
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {others.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium tracking-tight">Other programs</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((p) => (
              <ProgramCard key={p.id} program={p} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-medium tracking-tight">Recent sessions</h2>
        </div>
        {(sessions ?? []).length > 0 ? (
          <Card>
            <CardContent className="px-4 py-1">
              {(sessions ?? []).slice(0, 8).map((s) => (
                <Link
                  key={s.id}
                  href={`/health/gym/session/${s.id}`}
                  className="flex items-center justify-between gap-3 border-b py-3 text-sm last:border-b-0"
                >
                  <span className="min-w-0 truncate font-medium">{s.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {formatDate(s.performedOn, "short")}{" "}
                    · {s.setCount} sets
                    {s.status === "active" ? " · active" : ""}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">No sessions logged yet.</p>
        )}
      </section>
    </div>
  );
}
