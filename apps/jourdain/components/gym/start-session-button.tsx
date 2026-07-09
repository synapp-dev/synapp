"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Flame, Gauge, Play, RefreshCw } from "lucide-react";
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
import { usePrograms, useSessionPreview, useStartSession } from "@/hooks/gym/use-gym";
import { PlanEditor } from "@/components/gym/plan-editor";
import {
  type SessionIntensity,
  type SessionPreviewExercise,
} from "@/entities/gym/model/types";

/**
 * Start button that walks through a small wizard in a mobile bottom-sheet:
 * pick the intensity, then (for program starts) review and tune the session
 * plan before it begins. Used wherever a workout is kicked off: Today and
 * Programs.
 */
export function StartSessionButton({
  programId,
  exerciseIds,
  label = "Start",
  className,
  size = "sm",
}: {
  programId?: string;
  exerciseIds?: string[];
  label?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  const router = useRouter();
  const startSession = useStartSession();
  const preview = useSessionPreview();
  const { data: programs } = usePrograms();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"intensity" | "plan">("intensity");
  const [intensity, setIntensity] = useState<SessionIntensity>("normal");
  const [rows, setRows] = useState<SessionPreviewExercise[]>([]);

  const isSmart = programs?.find((p) => p.id === programId)?.isSmart ?? false;

  const start = async (chosen: SessionIntensity, plan?: SessionPreviewExercise[]) => {
    const session = await startSession.mutateAsync({
      programId: programId ?? null,
      exerciseIds,
      intensity: chosen,
      plan: plan?.map((r) => ({
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

  const chooseIntensity = (chosen: SessionIntensity) => {
    setIntensity(chosen);
    if (!programId) {
      // Ad-hoc starts have no program to preview; begin straight away.
      void start(chosen);
      return;
    }
    setStep("plan");
    // Only fetch on first entry; coming back from the plan step keeps tuning.
    if (rows.length === 0) preview.mutate(programId, { onSuccess: setRows });
  };

  const regenerate = () => {
    if (programId) preview.mutate(programId, { onSuccess: setRows });
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setStep("intensity");
      setRows([]);
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <Button size={size} className={className} disabled={startSession.isPending}>
          <Play className="mr-1 h-4 w-4" />
          {label}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          {step === "intensity" ? (
            <>
              <DrawerHeader className="text-left">
                <DrawerTitle>How hard today?</DrawerTitle>
                <DrawerDescription>Sets how the app suggests your loads this session.</DrawerDescription>
              </DrawerHeader>
              <div className="grid gap-2 p-4">
                <Button
                  variant="outline"
                  className="h-auto justify-start gap-3 py-3"
                  onClick={() => chooseIntensity("normal")}
                  disabled={startSession.isPending}
                >
                  <Gauge className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="text-left">
                    <span className="block font-medium">Normal</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      Steady progression: add a rep, then weight.
                    </span>
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto justify-start gap-3 py-3"
                  onClick={() => chooseIntensity("hard")}
                  disabled={startSession.isPending}
                >
                  <Flame className="h-5 w-5 shrink-0 text-orange-500" />
                  <span className="text-left">
                    <span className="block font-medium">Push hard</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      Bigger jumps: go for a PR.
                    </span>
                  </span>
                </Button>
              </div>
              <DrawerFooter className="pt-0" />
            </>
          ) : (
            <>
              <DrawerHeader className="text-left">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="-ml-2 h-8 w-8 shrink-0"
                    aria-label="Back to intensity"
                    onClick={() => setStep("intensity")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <DrawerTitle>Today&apos;s plan</DrawerTitle>
                </div>
                <DrawerDescription>
                  Drag to reorder, tune sets and rest, or just start as planned.
                </DrawerDescription>
              </DrawerHeader>

              <div className="max-h-[50vh] overflow-y-auto px-4">
                {preview.isPending ? (
                  <div className="flex justify-center py-10">
                    <Spinner />
                  </div>
                ) : rows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No exercises for this program yet. Start anyway and add them as you go.
                  </p>
                ) : (
                  <PlanEditor rows={rows} onChange={setRows} />
                )}
              </div>

              <DrawerFooter className="gap-2 pt-3">
                <Button
                  className="h-12 w-full"
                  disabled={startSession.isPending || preview.isPending}
                  onClick={() => void start(intensity, rows.length > 0 ? rows : undefined)}
                >
                  <Play className="mr-1 h-5 w-5" />
                  Start as planned
                </Button>
                {isSmart ? (
                  <Button
                    variant="outline"
                    className="h-11 w-full"
                    disabled={preview.isPending || startSession.isPending}
                    onClick={regenerate}
                  >
                    <RefreshCw className={cn("mr-1 h-4 w-4", preview.isPending && "animate-spin")} />
                    Regenerate picks
                  </Button>
                ) : null}
              </DrawerFooter>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
