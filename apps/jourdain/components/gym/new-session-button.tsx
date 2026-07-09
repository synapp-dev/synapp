"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Dumbbell, Flame, Gauge, Play, Plus, RefreshCw } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer";
import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";
import { useSessionPreviewAdhoc, useStartSession } from "@/hooks/gym/use-gym";
import { PlanEditor } from "@/components/gym/plan-editor";
import { estimateSessionMinutes, exerciseCountForMinutes } from "@/lib/gym/duration";
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  expandGroups,
  rollupSubgroups,
  type MuscleGroup,
  type SessionIntensity,
  type SessionPreviewExercise,
} from "@/entities/gym/model/types";

type Preset = { key: string; label: string; groups: MuscleGroup[] };

const PRESETS: Preset[] = [
  { key: "push", label: "Push", groups: ["chest", "shoulders", "arms"] },
  { key: "pull", label: "Pull", groups: ["back", "arms"] },
  { key: "legs", label: "Legs", groups: ["upper_legs", "lower_legs"] },
  { key: "upper", label: "Upper", groups: ["chest", "back", "shoulders", "arms"] },
  { key: "full", label: "Full body", groups: [...MUSCLE_GROUPS] },
];

type DurationChoice = { minutes: number; label: string };

const DURATIONS: DurationChoice[] = [
  { minutes: 30, label: "Quick" },
  { minutes: 45, label: "Short" },
  { minutes: 60, label: "Standard" },
  { minutes: 90, label: "Full" },
];

const sameGroups = (a: MuscleGroup[], b: MuscleGroup[]) =>
  a.length === b.length && a.every((g) => b.includes(g));

/** A readable session title from the trained groups, e.g. "Chest & Arms". */
function titleFor(groups: MuscleGroup[]): string {
  if (groups.length === 0) return "Workout";
  if (groups.length >= MUSCLE_GROUPS.length) return "Full body";
  const labels = groups.map((g) => MUSCLE_GROUP_LABELS[g]);
  if (labels.length <= 3) return labels.join(" & ");
  return `${labels.slice(0, 2).join(", ")} & more`;
}

/**
 * The ad-hoc "New session" wizard: choose muscle groups, choose a duration, get
 * a right-sized generated plan to review and tune, then start. No program.
 */
export function NewSessionButton({
  label = "New session",
  className,
  size = "default",
  variant = "default",
}: {
  label?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline";
}) {
  const router = useRouter();
  const startSession = useStartSession();
  const preview = useSessionPreviewAdhoc();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"parts" | "duration" | "plan">("parts");
  const [groups, setGroups] = useState<MuscleGroup[]>([]);
  const [minutes, setMinutes] = useState(60);
  const [intensity, setIntensity] = useState<SessionIntensity>("normal");
  const [rows, setRows] = useState<SessionPreviewExercise[]>([]);
  const [planSize, setPlanSize] = useState(5);

  const reset = () => {
    setStep("parts");
    setGroups([]);
    setMinutes(60);
    setIntensity("normal");
    setRows([]);
    setPlanSize(5);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const toggleGroup = (g: MuscleGroup) => {
    setGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const applyPreset = (preset: Preset) => {
    setGroups(sameGroups(groups, preset.groups) ? [] : [...preset.groups]);
  };

  const generate = () => {
    const nextSize = exerciseCountForMinutes(minutes);
    const subgroups = expandGroups(groups);
    setPlanSize(nextSize);
    preview.mutate(
      { subgroups, size: nextSize },
      {
        onSuccess: (result) => {
          if (result.length === 0) {
            toast.error("No exercises found for those muscles. Load your exercise library first.");
            return;
          }
          setRows(result);
          setStep("plan");
        },
      }
    );
  };

  const regenerate = () => {
    const subgroups = expandGroups(groups);
    preview.mutate({ subgroups, size: planSize }, { onSuccess: setRows });
  };

  const start = async () => {
    const trained = rollupSubgroups(rows.map((r) => r.subgroup));
    const session = await startSession.mutateAsync({
      intensity,
      title: titleFor(trained.length > 0 ? trained : groups),
      plan: rows.map((r) => ({
        exerciseId: r.exerciseId,
        warmupSets: r.warmupSets,
        workingSets: r.workingSets,
        dropSets: r.dropSets,
        restSeconds: r.restSeconds,
      })),
    });
    setOpen(false);
    router.push(`/health/gym/session/${session.id}`);
  };

  const estMinutes = estimateSessionMinutes(rows);
  const drifts = rows.length > 0 && Math.abs(estMinutes - minutes) > 12;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <Button size={size} variant={variant} className={className}>
          <Plus className="mr-1 h-4 w-4" />
          {label}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          {step === "parts" ? (
            <>
              <DrawerHeader className="text-left">
                <DrawerTitle>What do you want to train?</DrawerTitle>
                <DrawerDescription>Pick a preset or tap the muscles you want.</DrawerDescription>
              </DrawerHeader>
              <div className="space-y-4 p-4">
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset) => (
                    <Button
                      key={preset.key}
                      type="button"
                      size="sm"
                      variant={sameGroups(groups, preset.groups) ? "default" : "outline"}
                      className="h-9"
                      onClick={() => applyPreset(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {MUSCLE_GROUPS.map((g) => {
                    const active = groups.includes(g);
                    return (
                      <Button
                        key={g}
                        type="button"
                        variant={active ? "default" : "outline"}
                        className="h-12 justify-start"
                        onClick={() => toggleGroup(g)}
                      >
                        {MUSCLE_GROUP_LABELS[g]}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <DrawerFooter className="pt-1">
                <Button
                  className="h-12 w-full"
                  disabled={groups.length === 0}
                  onClick={() => setStep("duration")}
                >
                  Next
                </Button>
              </DrawerFooter>
            </>
          ) : step === "duration" ? (
            <>
              <DrawerHeader className="text-left">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="-ml-2 h-8 w-8 shrink-0"
                    aria-label="Back to muscles"
                    onClick={() => setStep("parts")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <DrawerTitle>How long?</DrawerTitle>
                </div>
                <DrawerDescription>We size the session to fit your time.</DrawerDescription>
              </DrawerHeader>
              <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-2">
                  {DURATIONS.map((d) => {
                    const active = minutes === d.minutes;
                    return (
                      <Button
                        key={d.minutes}
                        type="button"
                        variant={active ? "default" : "outline"}
                        className="h-16 flex-col gap-0.5"
                        onClick={() => setMinutes(d.minutes)}
                      >
                        <span className="text-lg font-semibold tabular-nums">{d.minutes} min</span>
                        <span className="text-xs font-normal opacity-80">{d.label}</span>
                      </Button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={intensity === "normal" ? "default" : "outline"}
                    className="h-11 gap-2"
                    onClick={() => setIntensity("normal")}
                  >
                    <Gauge className="h-4 w-4" />
                    Normal
                  </Button>
                  <Button
                    type="button"
                    variant={intensity === "hard" ? "default" : "outline"}
                    className="h-11 gap-2"
                    onClick={() => setIntensity("hard")}
                  >
                    <Flame className={cn("h-4 w-4", intensity === "hard" && "text-orange-400")} />
                    Push hard
                  </Button>
                </div>
              </div>
              <DrawerFooter className="pt-1">
                <Button className="h-12 w-full" disabled={preview.isPending} onClick={generate}>
                  {preview.isPending ? (
                    <Spinner className="mr-1 h-4 w-4" />
                  ) : (
                    <Dumbbell className="mr-1 h-4 w-4" />
                  )}
                  Generate
                </Button>
              </DrawerFooter>
            </>
          ) : (
            <>
              <DrawerHeader className="text-left">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="-ml-2 h-8 w-8 shrink-0"
                    aria-label="Back to duration"
                    onClick={() => setStep("duration")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <DrawerTitle>Your session</DrawerTitle>
                </div>
                <DrawerDescription>
                  About {estMinutes} min
                  {drifts ? ` · aiming for ${minutes} min, tune sets to fit` : ""}
                </DrawerDescription>
              </DrawerHeader>

              <div className="max-h-[50vh] overflow-y-auto px-4">
                {preview.isPending ? (
                  <div className="flex justify-center py-10">
                    <Spinner />
                  </div>
                ) : rows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No exercises found. Load your exercise library first.
                  </p>
                ) : (
                  <PlanEditor rows={rows} onChange={setRows} />
                )}
              </div>

              <DrawerFooter className="gap-2 pt-3">
                <Button
                  className="h-12 w-full"
                  disabled={startSession.isPending || preview.isPending || rows.length === 0}
                  onClick={() => void start()}
                >
                  <Play className="mr-1 h-5 w-5" />
                  Start workout
                </Button>
                <Button
                  variant="outline"
                  className="h-11 w-full"
                  disabled={preview.isPending || startSession.isPending}
                  onClick={regenerate}
                >
                  <RefreshCw className={cn("mr-1 h-4 w-4", preview.isPending && "animate-spin")} />
                  Regenerate
                </Button>
              </DrawerFooter>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
