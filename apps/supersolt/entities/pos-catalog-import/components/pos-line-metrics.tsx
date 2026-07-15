"use client";

import { cn } from "@workspace/ui/lib/utils";

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** GP% pill, colour-graded so margins read at a glance. */
export function GpPill({ gpPercent }: { gpPercent: number | null }) {
  if (gpPercent === null) {
    return <span className="text-muted-foreground text-sm tabular-nums">—</span>;
  }
  const tone =
    gpPercent >= 65
      ? "border-transparent bg-[var(--brand-supersolt-primary)]/25 text-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_25%,#0f2417)] dark:bg-[var(--brand-supersolt-primary)]/15 dark:text-[var(--brand-supersolt-primary)]"
      : gpPercent >= 45
        ? "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400"
        : "border-transparent bg-red-500/10 text-red-600 dark:text-red-400";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
        tone,
      )}
    >
      {gpPercent}% GP
    </span>
  );
}
