"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Gauge, Play, Timer } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import {
  useBodyWeights,
  useExerciseHistory,
  useExercises,
  useLogBodyWeight,
  useLogSet,
  useStandards,
  useUpdateSession,
} from "@/hooks/gym/use-gym";
import { suggestNextLoad } from "@/lib/gym/recommend";
import { evaluateBenchmark, evaluateRetry, proposeBenchmark, roundToPlate } from "@/lib/gym/benchmark";
import { useMeStore } from "@/entities/me/model/store";
import type {
  Session,
  SessionExercise,
  SessionIntensity,
  SetKind,
} from "@/entities/gym/model/types";

const DEFAULT_REP_MIN = 8;
const DEFAULT_REP_MAX = 12;
const WORKING_REPS = 10;
const WORKING_SETS = 3;
const WARMUP_FACTOR = 0.6;
const DROP_FACTOR = 0.8;
const REST_SECONDS: Record<SetKind, number> = { warmup: 45, working: 90, drop: 120 };

function num(value: string): number | null {
  const t = value.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

type PlannedSet = {
  role: SetKind;
  weight: number | null;
  reps: number | null;
  label: string;
  instruction: string;
  amrap: boolean;
};

/** The next set to perform for an exercise, or null when its plan is complete. */
function computeNext(p: {
  isFirstTime: boolean;
  calibrated: boolean;
  benchmarkWeight: number | null;
  retryWeight: number | null;
  retryMessage: string | null;
  W: number | null;
  warmups: number;
  workingCount: number;
  dropCount: number;
}): PlannedSet | null {
  const { isFirstTime, calibrated, benchmarkWeight, retryWeight, retryMessage, W } = p;
  if (isFirstTime && !calibrated) {
    return {
      role: "warmup",
      weight: p.warmups === 0 ? benchmarkWeight : retryWeight ?? benchmarkWeight,
      reps: null,
      amrap: true,
      label: p.warmups === 0 ? "Benchmark" : "Retry",
      instruction:
        p.warmups === 0
          ? "Your warm-up doubles as a benchmark — one all-out set, aim ~8 clean reps."
          : retryMessage ?? "Retry — one all-out set at the adjusted weight.",
    };
  }
  if (!isFirstTime && p.warmups === 0) {
    return {
      role: "warmup",
      weight: W != null ? roundToPlate(W * WARMUP_FACTOR) : null,
      reps: WORKING_REPS,
      amrap: false,
      label: "Warm-up",
      instruction: "Warm-up — light, ~10 easy reps to groove the movement.",
    };
  }
  if (p.workingCount < WORKING_SETS) {
    return {
      role: "working",
      weight: W,
      reps: WORKING_REPS,
      amrap: false,
      label: `Working set ${p.workingCount + 1} of ${WORKING_SETS}`,
      instruction: `Working set ${p.workingCount + 1} of ${WORKING_SETS} — ~${WORKING_REPS} controlled reps.`,
    };
  }
  if (p.dropCount === 0) {
    return {
      role: "drop",
      weight: W != null ? roundToPlate(W * DROP_FACTOR) : null,
      reps: null,
      amrap: true,
      label: "Drop set",
      instruction: "Final drop set — ~20% lighter, push to failure.",
    };
  }
  return null;
}

/** Rest countdown, auto-started after a set is ticked off. */
function RestTimer({ until, onDone }: { until: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((until - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    }, 250);
    return () => clearInterval(id);
  }, [until]);

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const done = remaining <= 0;
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <p className={cn("text-sm font-semibold uppercase tracking-widest", done ? "text-primary" : "text-muted-foreground")}>
        {done ? "Rested" : "Rest!"}
      </p>
      <div className="flex items-center gap-2">
        <Timer className={cn("h-6 w-6", done ? "text-primary" : "text-muted-foreground")} />
        <span className="text-4xl font-bold tabular-nums">
          {mm}:{ss.toString().padStart(2, "0")}
        </span>
      </div>
      <Button className="w-full" onClick={onDone}>
        {done ? "Let's go — next set" : "Done resting"}
      </Button>
    </div>
  );
}

/** Inline weigh-in — the benchmark seeds from bodyweight. */
function BodyweightGate() {
  const logBodyWeight = useLogBodyWeight();
  const [value, setValue] = useState("");
  return (
    <div className="flex items-center gap-2">
      <Input
        inputMode="decimal"
        placeholder="Bodyweight (kg)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-10"
      />
      <Button
        size="sm"
        className="h-10 shrink-0"
        onClick={() => {
          const w = num(value);
          if (w && w > 0) logBodyWeight.mutate({ weightKg: w });
        }}
        disabled={logBodyWeight.isPending || !num(value)}
      >
        Save
      </Button>
    </div>
  );
}

/** The set-entry screen: target up top, inputs below, one tick to complete. */
function SetScreen({
  planned,
  pending,
  onComplete,
}: {
  planned: PlannedSet;
  pending: boolean;
  onComplete: (vals: { weight: number | null; reps: number | null; rpe: number | null }) => void;
}) {
  const [weight, setWeight] = useState(planned.weight?.toString() ?? "");
  const [reps, setReps] = useState(planned.reps?.toString() ?? "");
  const [rpe, setRpe] = useState("");

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-muted/50 p-3 text-center">
        <p className="text-sm font-semibold">{planned.label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{planned.instruction}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1">
          <span className="text-[11px] text-muted-foreground">Weight (kg)</span>
          <Input
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="h-12 text-center text-lg tabular-nums"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted-foreground">
            Reps{planned.amrap ? " (max)" : ""}
          </span>
          <Input
            inputMode="numeric"
            placeholder={planned.amrap ? "AMRAP" : ""}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="h-12 text-center text-lg tabular-nums"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-muted-foreground">RPE</span>
          <Input
            inputMode="decimal"
            value={rpe}
            onChange={(e) => setRpe(e.target.value)}
            className="h-12 text-center text-lg tabular-nums"
          />
        </label>
      </div>
      <Button
        className="h-12 w-full"
        disabled={pending || num(reps) == null}
        onClick={() => onComplete({ weight: num(weight), reps: num(reps), rpe: num(rpe) })}
      >
        <Check className="mr-1 h-5 w-5" />
        Done
      </Button>
    </div>
  );
}

type Phase = "intro" | "set" | "rest" | "done";

function ExerciseRunner({
  sessionExercise,
  sessionId,
  intensity,
  isLast,
  onNext,
  onFinish,
}: {
  sessionExercise: SessionExercise;
  sessionId: string;
  intensity: SessionIntensity;
  isLast: boolean;
  onNext: () => void;
  onFinish: () => void;
}) {
  const logSet = useLogSet(sessionId);
  const { data: history } = useExerciseHistory(sessionExercise.exerciseId);
  const { data: exercises } = useExercises();
  const { data: bodyWeights } = useBodyWeights();
  const { data: standards } = useStandards();
  const sex = useMeStore((s) => s.currentUser?.sex) ?? "male";

  const [phase, setPhase] = useState<Phase>("intro");
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [workingOverride, setWorkingOverride] = useState<number | null>(null);

  const exercise = exercises?.find((e) => e.id === sessionExercise.exerciseId);
  const bodyweight = bodyWeights?.[0]?.weightKg ?? null;
  const isBodyweight = exercise?.isBodyweight ?? false;
  const standardsRows = exercise?.strengthLevelSlug
    ? standards?.get(exercise.strengthLevelSlug)?.[sex] ?? null
    : null;

  const sets = sessionExercise.sets;
  const isFirstTime = history != null && history.length === 0 && exercise != null;
  const needsBodyweight = isFirstTime && (standardsRows != null || isBodyweight) && bodyweight == null;
  const benchmark =
    isFirstTime && !needsBodyweight ? proposeBenchmark({ standardsRows, bodyweight, isBodyweight }) : null;

  const warmupSets = sets.filter((s) => s.kind === "warmup");
  const benchmarkSet = warmupSets[0];
  const retrySet = warmupSets[1];
  const verdict =
    isFirstTime && benchmarkSet && benchmarkSet.reps != null
      ? evaluateBenchmark({ weight: benchmarkSet.weight, reps: benchmarkSet.reps, isBodyweight, bodyweight, workingReps: WORKING_REPS })
      : null;
  const retryVerdict =
    verdict && verdict.quality !== "good" && retrySet && retrySet.reps != null && benchmarkSet?.reps != null
      ? evaluateRetry({ retryWeight: retrySet.weight, retryReps: retrySet.reps, priorReps: benchmarkSet.reps, isBodyweight, bodyweight, workingReps: WORKING_REPS })
      : null;
  const finalVerdict = retryVerdict ?? verdict;
  const calibrated = !isFirstTime || finalVerdict?.quality === "good";

  const suggestion =
    !isFirstTime && history && history.length > 0
      ? suggestNextLoad(history, DEFAULT_REP_MIN, DEFAULT_REP_MAX, intensity)
      : null;
  const lastWorking = (() => {
    const last = history?.[0];
    if (!last) return null;
    const ws = last.sets.filter((s) => !s.isWarmup && s.weight != null).map((s) => s.weight as number);
    return ws.length ? Math.max(...ws) : null;
  })();
  const baseWorking = isFirstTime ? finalVerdict?.workingWeight ?? null : suggestion?.weight ?? lastWorking;
  const W = workingOverride ?? baseWorking ?? null;

  const next = computeNext({
    isFirstTime,
    calibrated,
    benchmarkWeight: benchmark?.weight ?? null,
    retryWeight: finalVerdict?.retryWeight ?? null,
    retryMessage: finalVerdict && finalVerdict.quality !== "good" ? finalVerdict.message : null,
    W,
    warmups: warmupSets.length,
    workingCount: sets.filter((s) => s.kind === "working").length,
    dropCount: sets.filter((s) => s.kind === "drop").length,
  });

  // Once the plan is exhausted, surface the exercise-complete state.
  useEffect(() => {
    if (next == null && phase !== "done") setPhase("done");
  }, [next, phase]);

  const completedSets = sets.length;
  const planTotal = WORKING_SETS + 2; // warm-up + working + drop (approx, retries add)

  const complete = (vals: { weight: number | null; reps: number | null; rpe: number | null }) => {
    if (!next) return;
    if (next.role === "working" && vals.weight != null) setWorkingOverride(vals.weight);
    logSet.mutate(
      { sessionExerciseId: sessionExercise.id, weight: vals.weight, reps: vals.reps, rpe: vals.rpe, kind: next.role },
      { onSuccess: () => setRestUntil(Date.now() + REST_SECONDS[next.role] * 1000) }
    );
    setPhase("rest");
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-lg font-semibold">{sessionExercise.exerciseName}</p>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {completedSets}/{planTotal} sets
          </span>
        </div>

        {phase === "intro" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {isFirstTime
                ? "First time — your warm-up doubles as a benchmark, then 3 working sets and a drop set."
                : "Warm-up, 3 working sets, then a drop set to failure."}
            </p>
            {needsBodyweight ? (
              <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">
                  Log your bodyweight first — it seeds your starting weight.
                </p>
                <BodyweightGate />
              </div>
            ) : null}
            <Button className="h-12 w-full" disabled={needsBodyweight} onClick={() => setPhase("set")}>
              <Play className="mr-1 h-5 w-5" />
              Start exercise
            </Button>
          </div>
        ) : null}

        {phase === "set" && next ? (
          <>
            {isFirstTime && calibrated && next.role !== "warmup" ? (
              <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                <Gauge className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">Calibrated from your benchmark.</span>
              </div>
            ) : null}
            <SetScreen key={completedSets} planned={next} pending={logSet.isPending} onComplete={complete} />
          </>
        ) : null}

        {phase === "rest" && restUntil != null ? (
          <RestTimer
            until={restUntil}
            onDone={() => {
              setRestUntil(null);
              setPhase(next ? "set" : "done");
            }}
          />
        ) : null}

        {phase === "done" ? (
          <div className="space-y-3 py-2 text-center">
            <p className="text-sm font-medium">Nice — {sessionExercise.exerciseName} done 💪</p>
            {isLast ? (
              <Button className="h-12 w-full" onClick={onFinish}>
                <Check className="mr-1 h-5 w-5" />
                Finish workout
              </Button>
            ) : (
              <Button className="h-12 w-full" onClick={onNext}>
                Next exercise
                <ChevronRight className="ml-1 h-5 w-5" />
              </Button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SessionRunner({ session, sessionId }: { session: Session; sessionId: string }) {
  const router = useRouter();
  const updateSession = useUpdateSession(sessionId);
  const ordered = [...session.exercises].sort((a, b) => a.orderIndex - b.orderIndex);

  // Resume at the first exercise that isn't obviously finished (has a drop set).
  const firstUnfinished = Math.max(
    0,
    ordered.findIndex((e) => !e.sets.some((s) => s.kind === "drop"))
  );
  const [index, setIndex] = useState(firstUnfinished === -1 ? 0 : firstUnfinished);
  const current = ordered[Math.min(index, ordered.length - 1)];

  const finish = async () => {
    await updateSession.mutateAsync({ status: "completed" });
    toast.success("Workout logged");
    router.push("/health/gym");
  };

  if (!current) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          aria-label="Previous exercise"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium text-muted-foreground">
          Exercise {index + 1} of {ordered.length}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          disabled={index >= ordered.length - 1}
          onClick={() => setIndex((i) => Math.min(ordered.length - 1, i + 1))}
          aria-label="Next exercise"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <ExerciseRunner
        key={current.id}
        sessionExercise={current}
        sessionId={sessionId}
        intensity={session.intensity}
        isLast={index >= ordered.length - 1}
        onNext={() => setIndex((i) => Math.min(ordered.length - 1, i + 1))}
        onFinish={finish}
      />
    </div>
  );
}
