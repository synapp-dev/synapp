import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

/**
 * App-standard empty state: dashed rounded box with muted copy and an
 * optional CTA slot underneath. Server-safe (no hooks, no client APIs).
 */
export function EmptyState({
  children,
  cta,
  className,
}: {
  children: ReactNode;
  cta?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center text-sm",
        className,
      )}
    >
      <div className="max-w-sm">{children}</div>
      {cta ?? null}
    </div>
  );
}
