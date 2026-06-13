"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import { SUPPLIER_TRACEBACK } from "@/entities/inventory-setup/components/wizard/welcome/welcome-copy";

const STEP_REVEAL_MS = 650;

/**
 * Animated "everything traces back to the supplier" illustration. The sold
 * sandwich starts on the right and reveals right-to-left, with connecting
 * arrows pointing left: the sandwich → the ingredients it uses → the supplier
 * it all came from.
 */
export function SupplierTracebackIllustration({
  active,
  reduceMotion,
}: {
  active: boolean;
  reduceMotion: boolean;
}) {
  const total = SUPPLIER_TRACEBACK.length;
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
    <div className="flex flex-row-reverse flex-wrap items-center justify-center gap-2 sm:gap-3">
      {SUPPLIER_TRACEBACK.map((step, index) => {
        const shown = index < revealed;
        const Icon = step.icon;
        return (
          <React.Fragment key={step.label}>
            {index > 0 ? (
              <ArrowLeft
                className={cn(
                  "text-muted-foreground/60 h-5 w-5 shrink-0",
                  !reduceMotion && "transition-opacity duration-300",
                  shown ? "opacity-100" : "opacity-0",
                )}
                aria-hidden
              />
            ) : null}
            <div
              className={cn(
                "flex w-24 flex-col items-center gap-2 rounded-xl border p-3 text-center sm:w-28",
                "border-border bg-card",
                !reduceMotion &&
                  "transition-all duration-500 ease-out motion-reduce:transition-none",
                shown
                  ? "translate-y-0 opacity-100"
                  : "translate-y-2 opacity-0",
              )}
            >
              <span className="bg-muted text-foreground/70 flex h-9 w-9 items-center justify-center rounded-full">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-muted-foreground text-xs font-medium leading-tight">
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
