"use client";

import { usePathname, useRouter } from "next/navigation";
import { Check, Lock, TriangleAlert } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { buildScopedPath } from "@/lib/build-scoped-path";
import type { WizardStage } from "@/entities/inventory-setup/model/types";

export function SetupStepperBanner({
  stages,
  organisationSlug,
  venueSlug,
  className,
}: {
  stages: WizardStage[];
  organisationSlug: string;
  venueSlug: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <ol className={cn("flex flex-wrap items-center gap-2", className)}>
      {stages.map((stage, index) => {
        // Wizard stage ids (suppliers/inventory/products/storage) are the route
        // segments, so completion + locking line up with the section pages.
        const route = stage.id;
        const active = pathname.includes(`/settings/inventory-setup/${route}`);

        const complete = stage.status === "complete";
        const locked = stage.status === "locked";
        const current = stage.status === "current";
        // Orange warning: you're standing on this unlocked stage and it still
        // has missing items that block moving on. When you're on an earlier
        // (complete) stage, the next stage stays a neutral "active" target.
        const needsAttention = current && active;

        return (
          <li key={stage.id} className="flex items-center gap-2">
            {index > 0 ? (
              <span className="text-muted-foreground/50 text-xs" aria-hidden>
                →
              </span>
            ) : null}
            <button
              type="button"
              disabled={locked}
              title={needsAttention ? "Finish this stage to continue" : undefined}
              aria-current={active ? "page" : undefined}
              onClick={() =>
                router.push(
                  buildScopedPath(
                    organisationSlug,
                    venueSlug,
                    `settings/inventory-setup/${route}`,
                  ),
                )
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-1 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                // Complete / ready — green border, green text, faint green fill.
                complete &&
                  "border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/50 dark:bg-emerald-950/40 dark:text-emerald-300",
                // Current stage you're on, with blocking gaps — orange warning.
                needsAttention &&
                  "border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/50 dark:bg-amber-950/40 dark:text-amber-300",
                // Unlocked next stage you haven't engaged yet — neutral active.
                current &&
                  !needsAttention &&
                  "border-primary/40 bg-background text-foreground hover:bg-muted",
                // Locked — muted with a lock, not clickable.
                locked && "bg-muted text-muted-foreground cursor-not-allowed",
                active && complete && "ring-2 ring-ring ring-offset-1",
              )}
            >
              {complete ? (
                <Check className="h-3 w-3" aria-hidden />
              ) : needsAttention ? (
                <TriangleAlert className="h-3 w-3" aria-hidden />
              ) : locked ? (
                <Lock className="h-3 w-3" aria-hidden />
              ) : (
                <span
                  className="bg-primary h-1.5 w-1.5 rounded-full"
                  aria-hidden
                />
              )}
              {stage.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
