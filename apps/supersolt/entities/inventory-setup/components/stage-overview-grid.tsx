"use client";

import { Check, Lock } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import { WELCOME_STAGE_BOXES } from "@/entities/inventory-setup/components/wizard/welcome/welcome-copy";
import type { WizardStage } from "@/entities/inventory-setup/model/types";

/**
 * The four setup pillars as a column, with the current stage highlighted and a
 * staggered fade-in. Gives the per-stage intro a sense of place in the journey.
 */
export function StageOverviewGrid({
  statusById,
  currentId,
  reduceMotion,
}: {
  statusById: Map<string, WizardStage["status"]>;
  currentId: string;
  reduceMotion: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {WELCOME_STAGE_BOXES.map((box, index) => {
        const status = statusById.get(box.id) ?? "locked";
        const isCurrent = box.id === currentId;
        const Icon = box.icon;
        return (
          <div
            key={box.id}
            className={cn(
              !reduceMotion &&
                "animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500",
            )}
            style={
              reduceMotion ? undefined : { animationDelay: `${index * 110}ms` }
            }
          >
            <div
              className={cn(
                "flex w-72 items-center gap-4 rounded-2xl border p-4 text-left sm:p-5",
                isCurrent
                  ? "border-[var(--brand-supersolt-primary)] bg-[var(--brand-supersolt-primary)]/10 shadow-sm"
                  : status === "complete"
                    ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-950/20"
                    : "border-border bg-card",
                status === "locked" && !isCurrent && "opacity-70",
              )}
            >
              <span
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
                  isCurrent
                    ? "bg-[var(--brand-supersolt-primary)]/15 text-[var(--brand-supersolt-primary)]"
                    : status === "complete"
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-muted text-foreground/70",
                )}
              >
                {status === "complete" && !isCurrent ? (
                  <Check className="h-6 w-6" aria-hidden />
                ) : status === "locked" && !isCurrent ? (
                  <Lock className="h-6 w-6" aria-hidden />
                ) : (
                  <Icon className="h-6 w-6" aria-hidden />
                )}
              </span>
              <span className="text-base font-medium leading-tight">
                {box.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
