"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { pickInsightsPeriodSearchParams } from "@/entities/insights/lib/period";

export type SalesInsightsTab =
  | "overview"
  | "forecast"
  | "mix"
  | "menu"
  | "patterns"
  | "transactions";

const TABS: Array<{ id: SalesInsightsTab; label: string; segment: string }> = [
  { id: "overview", label: "Overview", segment: "" },
  { id: "forecast", label: "Forecast", segment: "forecast" },
  { id: "mix", label: "Sales mix", segment: "mix" },
  { id: "menu", label: "Menu", segment: "menu" },
  { id: "patterns", label: "Patterns", segment: "patterns" },
  { id: "transactions", label: "Transactions", segment: "transactions" },
];

type SalesTabsNavProps = {
  organisation: string;
  venue: string;
};

/**
 * Sales insights facet tabs. Real sub-routes (deep-linkable, Superbot-addressable);
 * hrefs carry the period params so the selected range survives tab switches
 * even on a hard load.
 */
export function SalesTabsNav({ organisation, venue }: SalesTabsNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const base = `/${organisation}/${venue}/insights/sales`;
  const periodQuery = pickInsightsPeriodSearchParams(searchParams);

  const active: SalesInsightsTab =
    TABS.find(
      (tab) => tab.segment !== "" && pathname.startsWith(`${base}/${tab.segment}`),
    )?.id ?? "overview";

  return (
    <nav
      className="bg-muted text-muted-foreground inline-flex w-fit max-w-full flex-wrap gap-1 rounded-lg p-1"
      aria-label="Sales insights sections"
    >
      {TABS.map((tab) => {
        const path = tab.segment ? `${base}/${tab.segment}` : base;
        return (
          <Link
            key={tab.id}
            href={periodQuery ? `${path}?${periodQuery}` : path}
            className={cn(
              "hover:text-foreground inline-flex items-center rounded-md border border-transparent px-3 py-1.5 text-sm font-medium transition-colors",
              active === tab.id &&
                "bg-background text-foreground border-input shadow-sm dark:bg-input/30",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
