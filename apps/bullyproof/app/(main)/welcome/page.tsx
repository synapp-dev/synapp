"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { usePageTitle } from "@/hooks/use-page-title";

export default function WelcomePage() {
  usePageTitle(["welcome"]);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setOpen(true);
  }, []);

  const steps = useMemo(
    () => [
      {
        key: "welcome",
        title: "Welcome to BullyProof",
        description: "A quick, friendly setup to get you oriented.",
        content: (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              We’ll walk you through a few short steps so you know where
              everything lives. This should take less than a minute.
            </p>
          </div>
        ),
      },
      {
        key: "profile",
        title: "Personalize your experience",
        description: "Tell us a little about your role and school.",
        content: (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You can refine these later in settings. For now, we’ll set a few
              sensible defaults.
            </p>
          </div>
        ),
      },
      {
        key: "get-started",
        title: "You’re all set",
        description: "Here’s what to do next.",
        content: (
          <div className="space-y-3">
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Invite teammates</li>
              <li>Explore your dashboard</li>
              <li>Review quick start guides</li>
            </ul>
          </div>
        ),
      },
    ],
    []
  );

  const clampedIndex = Math.min(Math.max(stepIndex, 0), steps.length - 1);
  const currentStep = steps[clampedIndex];
  const isFirst = clampedIndex === 0;
  const isLast = clampedIndex === steps.length - 1;

  if (steps.length === 0) return null;
  if (!currentStep) return null;

  function goNext() {
    if (!isLast) setStepIndex((i) => i + 1);
    else setOpen(false);
  }

  function goBack() {
    if (!isFirst) setStepIndex((i) => i - 1);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{currentStep.title}</DialogTitle>
          <DialogDescription>{currentStep.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <ol className="flex items-center gap-2" aria-label="Progress">
            {steps.map((step, idx) => (
              <li key={step.key} className="flex items-center gap-2">
                <div
                  className={
                    "size-2 rounded-full transition-colors " +
                    (idx <= stepIndex ? "bg-primary" : "bg-muted-foreground/30")
                  }
                  aria-hidden
                />
                {idx < steps.length - 1 && (
                  <div className="h-px w-6 bg-border" aria-hidden />
                )}
              </li>
            ))}
          </ol>

          {currentStep.content}
        </div>

        <DialogFooter>
          <div className="flex w-full items-center justify-between">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Skip for now
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={goBack} disabled={isFirst}>
                Back
              </Button>
              <Button onClick={goNext}>{isLast ? "Finish" : "Continue"}</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
