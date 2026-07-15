"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronsRight, ChevronsUp, Dumbbell, LineChart } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";
import { StaggeredAnimation } from "@workspace/ui/components/atoms/staggered-animation";
import { AnimatedNumber } from "@/components/gym/animated-number";
import { useStreamingText } from "@/hooks/use-streaming-text";
import { useStartSession } from "@/hooks/gym/use-gym";
import type {
  AgentWorkoutExercise,
  AgentCard,
} from "@/entities/agent/model/types";

type WorkoutCard = Extract<AgentCard, { type: "workout_session" }>;

// useStreamingText reveals ~2 chars every 28ms — ~14ms per character. We mirror
// that here to know when a streamed line has finished and the next step can run.
const CHAR_MS = 14;

// Durations (ms) for each step of a single card's reveal. Cards play strictly
// one at a time: the next only begins once the previous card's last animation
// (its weight count-up) has finished.
const STEP = {
  imgOffset: 90,
  titleOffset: 260,
  afterTitle: 110,
  musclesFade: 320,
  scoreCount: 720,
  afterMuscles: 120,
  machineFade: 320,
  afterMachine: 130,
  repsFade: 300,
  // Sets counts up first, then reps a beat later (incremental count-ups).
  repsCount: 520,
  repsStagger: 150,
  afterReps: 120,
  bottomFade: 320,
  kgCount: 680,
  endPad: 240,
} as const;

type RowTimeline = {
  imgAt: number;
  titleAt: number;
  musclesAt: number;
  machineAt: number;
  repsAt: number;
  bottomAt: number;
  /** When this card is fully done — i.e. when the next card may start. */
  endAt: number;
};

/** Lay out one card's reveal steps end-to-end, starting at `start` (ms from t0). */
function buildRowTimeline(
  ex: AgentWorkoutExercise,
  start: number,
): RowTimeline {
  const imgAt = start + STEP.imgOffset;
  const titleAt = start + STEP.titleOffset;
  const titleDone = titleAt + ex.name.length * CHAR_MS;
  const musclesAt = titleDone + STEP.afterTitle;
  // The score lives in the muscle badge now and counts up as it appears.
  const musclesDone =
    musclesAt +
    (ex.strength ? Math.max(STEP.musclesFade, STEP.scoreCount) : STEP.musclesFade);
  const machineAt = musclesDone + STEP.afterMuscles;
  const machineDone = machineAt + STEP.machineFade;
  const repsAt = machineDone + STEP.afterMachine;
  // Reps/sets slide down + count up; hold until the later (reps) count finishes.
  const repsDone =
    repsAt + Math.max(STEP.repsFade, STEP.repsStagger + STEP.repsCount);
  const bottomAt = repsDone + STEP.afterReps;
  const hasKg = !ex.needs1RM && ex.recommendedWeightKg != null;
  const bottomDone =
    bottomAt + (hasKg ? Math.max(STEP.bottomFade, STEP.kgCount) : STEP.bottomFade);
  const endAt = bottomDone + STEP.endPad;

  return { imgAt, titleAt, musclesAt, machineAt, repsAt, bottomAt, endAt };
}

/**
 * A reveal wrapper that fades its child in (with a delay) while the card is the
 * live turn, but renders it flat — no fade, no delay — once the card has settled
 * into the transcript, so re-mounting it there doesn't replay the choreography.
 */
function RowReveal({
  animate,
  baseDelay,
  fadeDirection,
  className,
  children,
}: {
  animate: boolean;
  baseDelay: number;
  fadeDirection: "up" | "down" | "left" | "right";
  className?: string;
  children: ReactNode;
}) {
  if (!animate) {
    return <div className={className}>{children}</div>;
  }
  return (
    <StaggeredAnimation
      index={0}
      baseDelay={baseDelay}
      incrementDelay={0}
      fadeDirection={fadeDirection}
      className={className}
    >
      {children}
    </StaggeredAnimation>
  );
}

/** A blinking caret that trails streaming text, matching the agent composer. */
function Caret() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[1px] animate-pulse rounded-full bg-sky-400/80 align-middle"
    />
  );
}

/**
 * One exercise, revealed procedurally so it reads as the agent assembling it:
 * the image slides in, the title types out, the muscle badge fades in (carrying
 * the level score, which counts up and is tinted to the standing), the machine
 * fades in, then the reps/sets fade in top-right and the weight counts up
 * bottom-right. All offsets are absolute (ms from t0), pre-computed so cards
 * play strictly one after another.
 */
function WorkoutExerciseRow({
  exercise,
  timeline,
  animate = true,
}: {
  exercise: AgentWorkoutExercise;
  timeline: RowTimeline;
  /** When false, render everything at rest — no count-ups, typing, or scroll.
   *  Used once the card has settled into the transcript above the live turn. */
  animate?: boolean;
}) {
  const { strength } = exercise;
  // A "needs a 1RM logged" card is otherwise normal — it just gets a gold border
  // and a gold 1RM badge where the weight would be.
  const gold = exercise.needs1RM;

  // Exact rep target rather than a range — the midpoint of the prescribed band.
  const exactReps = Math.round((exercise.repMin + exercise.repMax) / 2);

  const titleLen = useStreamingText(exercise.name, animate, timeline.titleAt);
  const titleShown = animate ? exercise.name.slice(0, titleLen) : exercise.name;
  const titleStreaming = animate && titleLen < exercise.name.length;

  // As this card's turn comes up, glide it to centre so the user follows the
  // reveal instead of it appearing below the fold. Reduced-motion users opt out,
  // as do settled cards (which mustn't yank the page when a new turn starts).
  const rowRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (
      !animate ||
      typeof window === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const startMs = Math.max(0, timeline.imgAt - STEP.imgOffset);
    const id = window.setTimeout(() => {
      rowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, startMs);
    return () => window.clearTimeout(id);
  }, [timeline.imgAt, animate]);

  const sec = (ms: number) => ms / 1000;

  // The muscle badge takes the standing's colour, falling back to the neutral
  // emerald when there's nothing to rate against.
  const muscleStyle = strength
    ? { borderColor: `${strength.color}66`, color: strength.color }
    : undefined;
  const muscleClass = strength ? "" : "border-emerald-500/30 text-emerald-500";

  return (
    <RowReveal
      animate={animate}
      baseDelay={sec(timeline.imgAt - STEP.imgOffset)}
      fadeDirection="up"
    >
      <div
        ref={rowRef}
        className={cn(
          "flex items-start gap-5 rounded-xl border bg-muted/30 p-5",
          gold ? "border-amber-500/50" : "border-border/70",
        )}
      >
        <RowReveal
          animate={animate}
          baseDelay={sec(timeline.imgAt)}
          fadeDirection="left"
        >
          {exercise.imageUrl ? (
            <Image
              src={exercise.imageUrl}
              alt={exercise.name}
              width={68}
              height={68}
              className="h-[68px] w-[68px] shrink-0 rounded-md object-contain"
              unoptimized
            />
          ) : (
            <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-md">
              <Dumbbell className="h-7 w-7 text-muted-foreground" />
            </div>
          )}
        </RowReveal>

        <div className="flex min-w-0 flex-1 items-stretch justify-between gap-3">
          {/* Left: title, then muscles (+ level score), then the machine. */}
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight text-foreground">
              {titleShown}
              {titleStreaming ? <Caret /> : null}
            </p>

            {exercise.muscles.length > 0 ? (
              <RowReveal
                animate={animate}
                baseDelay={sec(timeline.musclesAt)}
                fadeDirection="up"
                className="mt-1.5"
              >
                <Badge
                  variant="outline"
                  className={cn("gap-1 text-[11px] tabular-nums", muscleClass)}
                  style={muscleStyle}
                >
                  {exercise.muscles.join(" + ")}
                  {strength ? (
                    <>
                      <span className="opacity-40">·</span>
                      <AnimatedNumber
                        className="font-semibold"
                        value={strength.score}
                        durationMs={STEP.scoreCount}
                        delayMs={timeline.musclesAt}
                        animate={animate}
                      />
                    </>
                  ) : null}
                </Badge>
              </RowReveal>
            ) : null}

            <RowReveal
              animate={animate}
              baseDelay={sec(timeline.machineAt)}
              fadeDirection="up"
              className="mt-2"
            >
              <Badge
                variant="secondary"
                className="text-[11px] font-normal text-muted-foreground"
              >
                {exercise.stationLabel}
              </Badge>
            </RowReveal>
          </div>

          {/* Right: reps/sets up top, weight (or 1RM badge) at the bottom. */}
          <div className="flex shrink-0 flex-col items-end justify-between gap-2 self-stretch text-right">
            <RowReveal
              animate={animate}
              baseDelay={sec(timeline.repsAt)}
              fadeDirection="down"
            >
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  Sets
                </span>
                <AnimatedNumber
                  className="text-sm font-medium tabular-nums text-foreground"
                  value={exercise.sets}
                  durationMs={STEP.repsCount}
                  delayMs={timeline.repsAt}
                  enterFrom="above"
                  animate={animate}
                />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  Reps
                </span>
                <AnimatedNumber
                  className="text-sm font-medium tabular-nums text-foreground"
                  value={exactReps}
                  durationMs={STEP.repsCount}
                  delayMs={timeline.repsAt + STEP.repsStagger}
                  enterFrom="above"
                  animate={animate}
                />
              </div>
            </RowReveal>

            <RowReveal
              animate={animate}
              baseDelay={sec(timeline.bottomAt)}
              fadeDirection="up"
            >
              {exercise.needs1RM ? (
                <Badge
                  variant="outline"
                  className="border-amber-500/50 text-2xl font-bold text-amber-400"
                >
                  1RM
                </Badge>
              ) : exercise.recommendedWeightKg != null ? (
                <span className="flex items-center gap-1.5">
                  {/* Progressive overload: a subtle green lift, nudging "go up". */}
                  <ChevronsUp
                    aria-hidden
                    className="h-5 w-5 text-emerald-500 motion-safe:animate-overload-nudge motion-reduce:animate-none"
                  />
                  <span className="text-2xl font-bold tabular-nums text-foreground">
                    <AnimatedNumber
                      value={exercise.recommendedWeightKg}
                      decimals={
                        Number.isInteger(exercise.recommendedWeightKg) ? 0 : 1
                      }
                      durationMs={STEP.kgCount}
                      delayMs={timeline.bottomAt}
                      animate={animate}
                    />
                    kg
                  </span>
                </span>
              ) : null}
            </RowReveal>
          </div>
        </div>
      </div>
    </RowReveal>
  );
}

export function WorkoutSessionCard({
  card,
  revealDelayMs = 0,
  animate = true,
}: {
  card: WorkoutCard;
  /** When the card itself becomes visible — its rows reveal in sequence after. */
  revealDelayMs?: number;
  /** When false, render fully revealed with no choreography — for a settled
   *  card that has scrolled up into the transcript. */
  animate?: boolean;
}) {
  const router = useRouter();
  const startSession = useStartSession();

  // Demo: only surface exercises that have an illustration. The session we'd
  // start (and its ids) is scoped to those same exercises so the two stay in step.
  const exercises = card.exercises.filter((exercise) => exercise.imageUrl);
  const exerciseIds = exercises
    .map((exercise) => exercise.exerciseId)
    .filter((id): id is string => id != null);
  const canStart = exerciseIds.length > 0;

  async function handleStart() {
    const session = await startSession.mutateAsync({
      title: card.title,
      exerciseIds,
    });
    router.push(`/health/gym/session/${session.id}`);
  }

  // Chain the cards: each one starts only once the previous has fully finished.
  let cursor = revealDelayMs;
  const timelines = exercises.map((exercise) => {
    const timeline = buildRowTimeline(exercise, cursor);
    cursor = timeline.endAt;
    return timeline;
  });
  const actionsDelaySec = (cursor + 200) / 1000;

  return (
    <Card className="max-w-2xl border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Dumbbell className="h-4 w-4 text-emerald-500" />
          {card.title}
          <Badge
            variant="outline"
            className="border-emerald-500/30 text-[10px] text-emerald-500"
          >
            {card.focusLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No exercises available yet.
          </p>
        ) : (
          exercises.map((exercise, index) => (
            <WorkoutExerciseRow
              key={`${exercise.name}-${index}`}
              exercise={exercise}
              timeline={timelines[index]!}
              animate={animate}
            />
          ))
        )}

        {/* Actions live under the exercises — no backdrop card. */}
        <RowReveal
          animate={animate}
          baseDelay={actionsDelaySec}
          fadeDirection="up"
        >
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => router.push("/health/gym/progress")}
              className="capitalize"
            >
              <LineChart className="h-4 w-4" />
              See progress
            </Button>
            {canStart ? (
              <Button
                onClick={handleStart}
                disabled={startSession.isPending}
                className="w-fit font-semibold capitalize"
              >
                {startSession.isPending ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Start this session
                  </>
                ) : (
                  <>
                    Start this session
                    <ChevronsRight className="h-4 w-4 animate-bounce-right motion-reduce:animate-none" />
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </RowReveal>
      </CardContent>
    </Card>
  );
}
