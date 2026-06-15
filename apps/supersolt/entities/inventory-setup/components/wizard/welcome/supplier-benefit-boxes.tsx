"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";
import { SUPPLIER_BENEFITS } from "@/entities/inventory-setup/components/wizard/welcome/welcome-copy";

const STEP_REVEAL_MS = 450;

/** Things the bot can do once suppliers are in — revealed top-to-bottom in sequence. */
export function SupplierBenefitBoxes({
  active,
  reduceMotion,
}: {
  active: boolean;
  reduceMotion: boolean;
}) {
  const total = SUPPLIER_BENEFITS.length;
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
    <div className="flex w-full flex-col gap-3">
      {SUPPLIER_BENEFITS.map((benefit, index) => {
        const shown = index < revealed;
        const Icon = benefit.icon;
        return (
          <div
            key={benefit.label}
            className={cn(
              "flex flex-row items-center gap-3 rounded-2xl border p-4 text-left",
              "border-border bg-card",
              !reduceMotion &&
                "transition-all duration-500 ease-out motion-reduce:transition-none",
              shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
            )}
          >
            <span className="bg-[var(--brand-supersolt-primary)]/12 text-[var(--brand-supersolt-primary)] flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-sm font-medium leading-tight">
              {benefit.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
