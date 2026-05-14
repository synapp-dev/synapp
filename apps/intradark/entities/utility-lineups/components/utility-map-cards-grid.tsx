import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

export type UtilityMapCardsGridVariant = "catalog" | "picker";

const VARIANT_CLASS: Record<UtilityMapCardsGridVariant, string> = {
  /** Utility index: responsive 2–3 columns. */
  catalog: "gap-4 sm:grid-cols-2 lg:grid-cols-3",
  /** Upload wizard map step: three columns from `sm`, two on very narrow viewports. */
  picker: "grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3",
};

export function UtilityMapCardsGrid({
  variant = "catalog",
  className,
  children,
}: {
  variant?: UtilityMapCardsGridVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <ul className={cn("grid", VARIANT_CLASS[variant], className)}>{children}</ul>
  );
}
