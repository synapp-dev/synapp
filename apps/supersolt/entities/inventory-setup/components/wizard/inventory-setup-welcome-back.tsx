"use client";

import { ArrowRight, Check, Lock } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { AgentBotAvatarVideo } from "@/entities/ai-agent-chat/components/agent-bot-avatar-video";
import { BRAND_BUTTON_CLASS } from "@/entities/inventory-setup/components/stage-intro-steps";
import { WELCOME_STAGE_BOXES } from "@/entities/inventory-setup/components/wizard/welcome/welcome-copy";
import type { WizardStage } from "@/entities/inventory-setup/model/types";

/**
 * Replayed every time a returning user opens the Inventory Setup root: a
 * "welcome back, you're up to here" greeting whose Continue drops them straight
 * onto the stage they're up to (where that stage's intro plays). Not persisted
 * — it's a per-visit nudge.
 */
export function InventorySetupWelcomeBack({
  stages,
  currentStage,
  firstName,
  reduceMotion,
  onDone,
}: {
  stages: WizardStage[];
  currentStage: WizardStage;
  firstName: string | null;
  reduceMotion: boolean;
  onDone: () => void;
}) {
  const name = firstName?.trim() ? firstName.trim() : "there";
  const statusById = new Map(stages.map((s) => [s.id, s.status]));

  return (
    <div className="flex min-h-[32rem] w-full flex-1 items-center justify-center py-6">
      <div className="flex w-full max-w-3xl flex-col gap-4">
        <div className="flex items-center px-1">
          <span className="text-muted-foreground text-sm font-medium tracking-wide">
            Inventory Setup
          </span>
        </div>

        <Card className="bg-[var(--brand-supersolt-primary)]/10 flex w-full flex-col items-center justify-center gap-8 overflow-hidden px-8 py-12 text-center sm:px-12">
      <span className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-50 dark:bg-emerald-950/40 sm:h-48 sm:w-48">
        <AgentBotAvatarVideo
          aria-hidden
          poster="/images/supersolt-bot.png"
          className="h-full w-full"
        />
      </span>

      <div
        className={cn(
          "flex w-full max-w-xl flex-col items-center gap-6",
          !reduceMotion &&
            "animate-in fade-in slide-in-from-bottom-2 duration-500",
        )}
      >
        <div className="flex flex-col gap-1.5">
          <p className="text-foreground text-balance text-2xl font-medium leading-snug sm:text-3xl">
            Welcome back, {name}!
          </p>
          <p className="text-muted-foreground text-balance text-base sm:text-lg">
            You&apos;re up to{" "}
            <span className="text-foreground font-semibold">
              {currentStage.label}
            </span>{" "}
            — let&apos;s pick up where you left off.
          </p>
        </div>

        <StageProgressRow statusById={statusById} currentId={currentStage.id} />
      </div>
        </Card>

        <div className="flex flex-col items-center gap-4">
          <Button
            type="button"
            onClick={onDone}
            size="lg"
            className={cn("h-12 px-7 text-base", BRAND_BUTTON_CLASS)}
          >
            Continue
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

function StageProgressRow({
  statusById,
  currentId,
}: {
  statusById: Map<string, WizardStage["status"]>;
  currentId: string;
}) {
  return (
    <ol className="flex flex-wrap items-center justify-center gap-2">
      {WELCOME_STAGE_BOXES.map((box, index) => {
        const status = statusById.get(box.id) ?? "locked";
        const isCurrent = box.id === currentId;
        const Icon = box.icon;
        return (
          <li key={box.id} className="flex items-center gap-2">
            {index > 0 ? (
              <span
                className="text-muted-foreground/40 text-xs select-none"
                aria-hidden
              >
                →
              </span>
            ) : null}
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
                status === "complete" &&
                  "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-300",
                isCurrent &&
                  "border-[var(--brand-supersolt-primary)] bg-[var(--brand-supersolt-primary)]/10 text-foreground ring-2 ring-[var(--brand-supersolt-primary)]/30",
                status === "locked" &&
                  "text-muted-foreground border-dashed opacity-70",
              )}
            >
              {status === "complete" ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : status === "locked" ? (
                <Lock className="h-4 w-4" aria-hidden />
              ) : (
                <Icon className="h-4 w-4" aria-hidden />
              )}
              {box.label}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
