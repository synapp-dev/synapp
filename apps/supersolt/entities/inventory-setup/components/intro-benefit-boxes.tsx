"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";
import type { StageBenefit } from "@/entities/inventory-setup/components/stage-intro-copy";

const STEP_REVEAL_MS = 450;

/** Animated, staggered reveal of what the bot can do for a stage. */
export function IntroBenefitBoxes({
  benefits,
  active,
  reduceMotion,
}: {
  benefits: readonly StageBenefit[];
  active: boolean;
  reduceMotion: boolean;
}) {
  const total = benefits.length;
  const [revealed, setRevealed] = React.useState(reduceMotion ? total : 0);

  React.useEffect(() => {
    if (!active) return;
    if (reduceMotion) {
      setRevealed(total);
      return;
    }
    setRevealed(0);
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setRevealed(n);
      if (n >= total) window.clearInterval(id);
    }, STEP_REVEAL_MS);
    return () => window.clearInterval(id);
  }, [active, reduceMotion, total]);

  return (
    <div className="flex w-full flex-col gap-4">
      {benefits.map((benefit, index) => {
        const shown = index < revealed;
        const Icon = benefit.icon;
        return (
          <div
            key={benefit.label}
            className={cn(
              "flex flex-row items-center gap-4 rounded-2xl border p-5 text-left",
              "border-border bg-card",
              !reduceMotion &&
                "transition-all duration-500 ease-out motion-reduce:transition-none",
              shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
            )}
          >
            <span className="bg-[var(--brand-supersolt-primary)]/12 text-[var(--brand-supersolt-primary)] flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
              <Icon className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-base font-medium leading-tight">
              {benefit.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
