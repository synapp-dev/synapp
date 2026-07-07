"use client";

import { format, parseISO } from "date-fns";
import { Activity } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { MetricCard } from "@/components/health/metric-card";
import { METRICS } from "@/lib/health/metrics";
import { formatHours } from "@/lib/format";
import {
  useHealthMetrics,
  useWorkouts,
  type Workout,
} from "@/hooks/health/use-health";

const NAMES = [
  METRICS.step_count.name,
  METRICS.walking_running_distance.name,
  METRICS.active_energy.name,
  METRICS.apple_exercise_time.name,
  METRICS.flights_climbed.name,
  METRICS.apple_stand_time.name,
  METRICS.vo2_max.name,
  METRICS.walking_speed.name,
] as const;

function duration(seconds: number | null): string {
  if (seconds == null) return "\u2014";
  return formatHours(seconds / 60);
}

function workoutDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "d MMM, h:mm a");
  } catch {
    return "—";
  }
}

function WorkoutRow({ workout }: { workout: Workout }) {
  const stats = [
    workout.distance != null ? `${workout.distance.toFixed(2)} km` : null,
    workout.totalEnergy != null ? `${Math.round(workout.totalEnergy)} kJ` : null,
    workout.avgHeartRate != null
      ? `${Math.round(workout.avgHeartRate)} bpm avg`
      : null,
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-3 border-b py-3 last:border-b-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Activity className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{workout.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {workoutDate(workout.start)} · {duration(workout.duration)}
          {workout.location ? ` · ${workout.location}` : ""}
        </p>
      </div>
      {stats.length > 0 ? (
        <p className="shrink-0 text-right text-xs text-muted-foreground tabular-nums">
          {stats.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

export default function HealthFitnessPage() {
  const { data: metrics, isFetching } = useHealthMetrics(NAMES);
  const { data: workouts } = useWorkouts();
  const samples = metrics ?? [];
  const of = (name: string) => samples.filter((s) => s.name === name);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Fitness</h1>
        {isFetching && samples.length === 0 ? (
          <span className="text-xs text-muted-foreground">Loading…</span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard meta={METRICS.step_count} samples={of(METRICS.step_count.name)} />
        <MetricCard
          meta={METRICS.walking_running_distance}
          samples={of(METRICS.walking_running_distance.name)}
        />
        <MetricCard
          meta={METRICS.active_energy}
          samples={of(METRICS.active_energy.name)}
        />
        <MetricCard
          meta={METRICS.apple_exercise_time}
          samples={of(METRICS.apple_exercise_time.name)}
        />
        <MetricCard
          meta={METRICS.flights_climbed}
          samples={of(METRICS.flights_climbed.name)}
        />
        <MetricCard
          meta={METRICS.apple_stand_time}
          samples={of(METRICS.apple_stand_time.name)}
        />
        <MetricCard meta={METRICS.vo2_max} samples={of(METRICS.vo2_max.name)} />
        <MetricCard
          meta={METRICS.walking_speed}
          samples={of(METRICS.walking_speed.name)}
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight">Workouts</h2>
        {(workouts ?? []).length > 0 ? (
          <Card>
            <CardContent className="px-4 py-1">
              {(workouts ?? []).map((workout) => (
                <WorkoutRow key={workout.id} workout={workout} />
              ))}
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">
            No workouts in this export yet.
          </p>
        )}
      </div>
    </section>
  );
}
