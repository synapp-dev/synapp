"use client";

import { cn } from "@workspace/ui/lib/utils";
import { WELCOME_STAGE_BOXES } from "@/entities/inventory-setup/components/wizard/welcome/welcome-copy";

/**
 * The four inventory-setup pillars, stacked as a single column of rows. When
 * `collapsed` is true every pillar except Suppliers vanishes one at a time
 * (staggered by index), leaving Suppliers highlighted and centred — the visual
 * handoff into the suppliers walkthrough.
 */
export function WelcomeStageGrid({
  collapsed,
  reduceMotion,
}: {
  collapsed: boolean;
  reduceMotion: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-stretch",
        !reduceMotion && "transition-[gap] duration-500 ease-in-out",
        // Drop the row gap on collapse so the lone Suppliers card stays centred.
        collapsed ? "gap-0" : "gap-3",
      )}
    >
      {WELCOME_STAGE_BOXES.map((box, index) => {
        const isSuppliers = box.id === "suppliers";
        const hidden = collapsed && !isSuppliers;
        const Icon = box.icon;
        return (
          <div
            key={box.id}
            className={cn(
              "overflow-hidden",
              !reduceMotion &&
                "transition-all duration-500 ease-in-out motion-reduce:transition-none",
              hidden
                ? "max-h-0 scale-95 opacity-0"
                : "max-h-24 scale-100 opacity-100",
            )}
            style={
              reduceMotion ? undefined : { transitionDelay: `${index * 120}ms` }
            }
            aria-hidden={hidden}
          >
            <div
              className={cn(
                "flex w-52 items-center gap-3 rounded-2xl border p-3 text-left sm:w-56 sm:p-4",
                !reduceMotion && "transition-colors duration-500",
                collapsed && isSuppliers
                  ? "border-[var(--brand-supersolt-primary)] bg-[var(--brand-supersolt-primary)]/10 shadow-sm"
                  : "border-border bg-card",
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                  collapsed && isSuppliers
                    ? "bg-[var(--brand-supersolt-primary)]/15 text-[var(--brand-supersolt-primary)]"
                    : "bg-muted text-foreground/70",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-sm font-medium leading-tight">
                {box.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
