"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { cn } from "@workspace/ui/lib/utils";
import { AgentBotAvatarVideo } from "@/entities/ai-agent-chat/components/agent-bot-avatar-video";
import { BRAND_BUTTON_CLASS } from "@/entities/inventory-setup/components/stage-intro-steps";
import { useStreamingText } from "@/entities/dashboard/components/superbot-suggestions-use-streaming-text";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { buildScopedPath } from "@/lib/build-scoped-path";
import type { WizardStage } from "@/entities/inventory-setup/model/types";

/**
 * Shown above a section's content once its stage is complete: the superbot
 * nudges the user to advance to the next stage, gated behind a confirmation
 * that explains why the upcoming work matters.
 */
export function SetupStageProceedCard({
  currentStage,
  nextStage,
  organisationSlug,
  venueSlug,
}: {
  currentStage: WizardStage;
  nextStage: WizardStage;
  organisationSlug: string;
  venueSlug: string;
}) {
  const router = useRouter();
  const reduceMotion = usePrefersReducedMotion();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const message = `Nice — your ${currentStage.label.toLowerCase()} are all set. Ready to move on to ${nextStage.label}?`;
  const visibleLen = useStreamingText(
    message,
    `setup-proceed:${currentStage.id}`,
    reduceMotion,
    true,
  );
  const shown = reduceMotion ? message : message.slice(0, visibleLen);
  const streaming = !reduceMotion && visibleLen < message.length;

  const goNext = () => {
    setConfirmOpen(false);
    router.push(
      buildScopedPath(
        organisationSlug,
        venueSlug,
        `settings/inventory-setup/${nextStage.id}`,
      ),
    );
  };

  return (
    <>
      <Card className="flex flex-row flex-wrap items-center gap-4 border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/30 dark:bg-emerald-950/20">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <AgentBotAvatarVideo
            aria-hidden
            poster="/images/supersolt-bot.png"
            className="h-full w-full"
          />
        </span>
        <p
          className="text-foreground min-w-0 flex-1 text-sm font-medium"
          aria-live="polite"
        >
          {shown}
          {streaming ? (
            <span
              className="bg-muted-foreground/60 ml-px inline-block h-[1.05em] w-px animate-pulse align-middle"
              aria-hidden
            />
          ) : null}
        </p>
        <Button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className={cn("shrink-0", BRAND_BUTTON_CLASS)}
        >
          Next
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-50 dark:bg-emerald-950/40">
              <AgentBotAvatarVideo
                aria-hidden
                poster="/images/supersolt-bot.png"
                className="h-full w-full"
              />
            </span>
            <DialogHeader className="flex-1 space-y-2 text-left">
              <DialogTitle>Before you move on to {nextStage.label}</DialogTitle>
              <DialogDescription>
                For SuperSolt to track stock levels, cost your recipes, and
                suggest orders accurately, every supplier item needs to be turned
                into a{" "}
                <strong className="text-foreground font-semibold">
                  trackable ingredient
                </strong>{" "}
                and linked in the next steps. You can always come back to add or
                edit suppliers later.
              </DialogDescription>
            </DialogHeader>
          </div>
          <p className="text-muted-foreground text-sm">
            Are you sure you want to continue to {nextStage.label}?
          </p>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Not yet
            </Button>
            <Button type="button" onClick={goNext} className={BRAND_BUTTON_CLASS}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Yes, continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
