"use client";

import { Check, Upload } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { cn } from "@workspace/ui/lib/utils";

import {
  STEP_ICONS,
  STEP_INDEX_CHOOSE_MAP,
  STEP_INDEX_ENEMY_POV,
  STEP_INDEX_NADE_DETAILS,
  STEP_INSTRUCTIONS,
  STEP_LABELS,
} from "./constants";
import { WizardSidebarVideoPeek } from "./shared-components";
import { useUploadWizard } from "./upload-wizard-context";
import { UploadWizardDialogs } from "./wizard-dialogs";
import { UploadWizardStepPanel } from "./wizard-step-panel";

export function UploadWizardSheetShell() {
  const {
    open,
    handleSheetOpenChange,
    stepIndex,
    setStepIndex,
    canNavigateToStep,
    validateStep,
    filePreviewUrl,
    enqueueLoading,
    enemyPovFile,
    enqueue,
    confirmCloseOpen,
    setConfirmCloseOpen,
    confirmAbandon,
  } = useUploadWizard();

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="top"
          className="left-1/2 flex h-[min(46rem,92dvh)] max-h-[92dvh] w-full max-w-4xl -translate-x-1/2 flex-col gap-0 overflow-hidden rounded-b-xl border-x border-b px-4 pb-6 pt-2 sm:px-8"
        >
          <div className="flex h-full min-h-0 w-full flex-col gap-0">
            <SheetHeader className="border-border flex h-full max-h-24 shrink-0 flex-col justify-center gap-1 border-b p-0 text-left">
              <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                <Upload className="size-6 text-primary" />
                Upload Lineup
              </SheetTitle>
              <SheetDescription className="line-clamp-4 leading-snug">
                {STEP_INSTRUCTIONS[stepIndex]}
              </SheetDescription>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-8 py-4 sm:flex-row">
              <div className="flex w-full shrink-0 flex-col gap-3 sm:w-44 sm:self-start">
                <nav
                  aria-label="Wizard steps"
                  className="bg-muted/25 flex h-fit w-full shrink-0 gap-1 overflow-x-auto overflow-y-hidden rounded-xl px-2 py-2 sm:flex-col sm:overflow-x-visible sm:px-3 sm:py-3"
                >
                  {STEP_LABELS.map((label, i) => {
                    const unlocked = canNavigateToStep(i);
                    const complete = validateStep(i) === null;
                    const active = stepIndex === i;
                    const StepGlyph = STEP_ICONS[i]!;
                    return (
                      <button
                        key={label}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => {
                          if (unlocked) setStepIndex(i);
                        }}
                        className={cn(
                          "flex min-w-[10rem] shrink-0 items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors sm:min-w-0 sm:shrink",
                          active && "bg-background font-medium shadow-sm",
                          !unlocked && "cursor-not-allowed opacity-45",
                          unlocked && !active && "hover:bg-background/70",
                        )}
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center">
                          {complete ? (
                            <Check
                              className="text-primary size-4 shrink-0"
                              aria-hidden
                            />
                          ) : (
                            <StepGlyph
                              className="text-muted-foreground size-4 shrink-0"
                              aria-hidden
                            />
                          )}
                        </span>
                        <span className="line-clamp-2 leading-snug">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </nav>
                {stepIndex >= STEP_INDEX_NADE_DETAILS &&
                stepIndex !== STEP_INDEX_ENEMY_POV &&
                filePreviewUrl ? (
                  <WizardSidebarVideoPeek
                    videoSrc={filePreviewUrl}
                    stepIndex={stepIndex}
                  />
                ) : null}
              </div>
              <ScrollArea className="min-h-0 min-w-0 flex-1">
                <UploadWizardStepPanel />
              </ScrollArea>
            </div>

            <SheetFooter className="border-border mt-0 flex h-14 shrink-0 flex-row items-center justify-between gap-2 border-t p-0">
              <Button
                type="button"
                variant="outline"
                disabled={stepIndex === STEP_INDEX_CHOOSE_MAP || enqueueLoading}
                onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
              >
                Back
              </Button>
              <div className="flex gap-2">
                {stepIndex < STEP_LABELS.length - 1 ? (
                  <Button
                    type="button"
                    disabled={Boolean(validateStep(stepIndex))}
                    onClick={() =>
                      setStepIndex((s) =>
                        Math.min(STEP_LABELS.length - 1, s + 1),
                      )
                    }
                  >
                    {stepIndex === STEP_INDEX_ENEMY_POV && !enemyPovFile
                      ? "Skip"
                      : "Next"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={
                      Boolean(validateStep(stepIndex)) || enqueueLoading
                    }
                    onClick={() => void enqueue()}
                  >
                    {enqueueLoading ? "Queueing…" : "Add to upload queue"}
                  </Button>
                )}
              </div>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
      <UploadWizardDialogs />

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard upload wizard?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Closing will discard this lineup draft
              (nothing is queued yet).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAbandon}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
