"use client";

import { ArrowRight } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { AgentBotAvatarVideo } from "@/entities/ai-agent-chat/components/agent-bot-avatar-video";
import { BRAND_BUTTON_CLASS } from "@/entities/inventory-setup/components/stage-intro-steps";
import { useStreamingText } from "@/entities/dashboard/components/superbot-suggestions-use-streaming-text";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/** Green superbot nudge to start the guided normalisation wizard. */
export function NormalisationIntroCard({
  pendingCount,
  onStart,
}: {
  pendingCount: number;
  onStart: () => void;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const message = `Let's turn your ${pendingCount} supplier item${pendingCount === 1 ? "" : "s"} into trackable ingredients. Want me to walk you through it, one at a time?`;
  const len = useStreamingText(message, "normalise-intro", reduceMotion, true);
  const shown = reduceMotion ? message : message.slice(0, len);
  const streaming = !reduceMotion && len < message.length;

  return (
    <Card className="flex flex-row flex-wrap items-center gap-4 border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/30 dark:bg-emerald-950/20">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/40">
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
        onClick={onStart}
        className={cn("shrink-0", BRAND_BUTTON_CLASS)}
      >
        Yes, let&apos;s go
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </Card>
  );
}
