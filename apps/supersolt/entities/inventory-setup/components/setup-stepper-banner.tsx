"use client";

import { Check, Lock } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { InventorySetupStep } from "@/entities/inventory-setup/model/types";

export function SetupStepperBanner({ steps }: { steps: InventorySetupStep[] }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3">
      <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
        Inventory setup
      </p>
      <ol className="flex flex-wrap items-center gap-2">
        {steps.map((step, index) => (
          <li key={step.id} className="flex items-center gap-2">
            {index > 0 ? (
              <span className="text-muted-foreground/50 text-xs" aria-hidden>
                →
              </span>
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                step.status === "complete" && "bg-primary/10 text-primary",
                step.status === "pending" && "bg-background border text-foreground",
                step.status === "locked" && "bg-muted text-muted-foreground",
              )}
            >
              {step.status === "complete" ? (
                <Check className="h-3 w-3" aria-hidden />
              ) : step.status === "locked" ? (
                <Lock className="h-3 w-3" aria-hidden />
              ) : (
                <span className="bg-primary h-1.5 w-1.5 rounded-full" aria-hidden />
              )}
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
