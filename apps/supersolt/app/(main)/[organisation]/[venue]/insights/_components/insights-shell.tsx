"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { InsightsPeriodControls } from "@/entities/insights/components/insights-period-controls";
import {
  buildInsightsTabHref,
  type InsightsTabSection,
} from "@/entities/insights/lib/build-insights-tab-href";
import { InsightsPeriodProvider } from "@/entities/insights/model/insights-period-provider";
import { getScopedContextFromPathname } from "@/entities/access/scoped-navigation-context";
import { cn } from "@workspace/ui/lib/utils";

const INSIGHTS_TABS: Array<{ id: InsightsTabSection; label: string }> = [
  { id: "sales", label: "Sales" },
  { id: "labour", label: "Labour" },
  { id: "inventory", label: "Inventory" },
  { id: "p-and-l", label: "P&L" },
];

function tabClassName(active: boolean) {
  return cn(
    "text-muted-foreground hover:text-foreground inline-flex items-center rounded-md border border-transparent px-3 py-1.5 text-sm font-medium transition-colors",
    active &&
      "bg-background text-foreground shadow-sm border-input dark:bg-input/30",
  );
}

function InsightsShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scoped = getScopedContextFromPathname(pathname);
  if (!scoped) {
    return (
      <div className="text-muted-foreground text-sm">
        Select an organisation and venue to view insights.
      </div>
    );
  }
  const { organisationSlug, venueSlug } = scoped;

  const activeTab = INSIGHTS_TABS.find((tab) =>
    pathname.endsWith(`/insights/${tab.id}`),
  )?.id;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
          <p className="text-muted-foreground text-sm">
            Sales, labour, inventory, and P&amp;L for this venue.
          </p>
        </div>
        <InsightsPeriodControls />
      </div>

      <nav
        className="bg-muted text-muted-foreground inline-flex w-fit max-w-full flex-wrap gap-1 rounded-lg p-1"
        aria-label="Insights modules"
      >
        {INSIGHTS_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={buildInsightsTabHref(
              organisationSlug,
              venueSlug,
              tab.id,
              searchParams,
            )}
            className={tabClassName(activeTab === tab.id)}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

export function InsightsShell({ children }: { children: React.ReactNode }) {
  return (
    <InsightsPeriodProvider>
      <Suspense
        fallback={
          <div className="text-muted-foreground text-sm" aria-busy="true">
            Loading insights…
          </div>
        }
      >
        {/* <InsightsShellInner>{children}</InsightsShellInner> */}
        {children}
      </Suspense>
    </InsightsPeriodProvider>
  );
}
