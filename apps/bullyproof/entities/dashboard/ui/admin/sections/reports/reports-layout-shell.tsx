"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { Combobox } from "@/components/molecules/combobox";
import {
  ReportsOverviewProvider,
  useReportsOverview,
} from "@/entities/dashboard/ui/admin/sections/reports/reports-overview-context";
import { pathWithSchool } from "@/entities/dashboard/ui/admin/sections/reports/reports-utils";
const NAV = [
  { href: "/admin/reports", label: "Overview" },
  { href: "/admin/reports/certification", label: "Certification" },
  { href: "/admin/reports/onboarding", label: "Onboarding" },
  { href: "/admin/reports/lessons", label: "Lessons" },
] as const;

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/admin/reports") {
    return pathname === "/admin/reports";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ReportsLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const {
    loadError,
    overviewLoading,
    overview,
    schoolIdFromUrl,
    setSchoolFilter,
    schoolOptions,
    schoolsLoading,
  } = useReportsOverview();

  const scopeOptions = useMemo(
    () => [
      { value: "", label: "All schools" },
      ...schoolOptions.map((s) => ({
        value: s.id,
        label: s.name,
        avatarUrl: s.avatarUrl,
      })),
    ],
    [schoolOptions],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center">
          <FileText className="h-4 w-4 mr-2" />
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        </div>
      </div>

      <div className="flex gap-4 w-full">
        <div className="flex items-center gap-3 w-full max-w-1/4">
          <Combobox
            options={scopeOptions}
            value={schoolIdFromUrl || ""}
            onValueChange={(v) => setSchoolFilter(v ?? "")}
            placeholder="All Schools"
            searchPlaceholder="Search Schools..."
            emptyText="No schools found."
            triggerClassName="w-full h-11 min-h-11"
            disabled={schoolsLoading}
            displayLabel={schoolsLoading ? "Loading schools..." : undefined}
            schoolVisuals
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 sm:gap-4">
          <span
            className="shrink-0 text-2xl leading-none text-muted-foreground/80"
            aria-hidden
          >
            ·
          </span>
          <nav
            className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3"
            aria-label="Reports sections"
          >
            {NAV.map(({ href, label }) => {
              const to = pathWithSchool(href, schoolIdFromUrl);
              const active = isNavActive(pathname ?? "", href);
              return (
                <Link
                  key={href}
                  href={to}
                  className={cn(
                    "inline-flex h-11 min-h-11 shrink-0 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors sm:text-[0.9375rem]",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {loadError ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{loadError}</p>
          </CardContent>
        </Card>
      ) : null}

      {overviewLoading && !overview ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {overview ? children : null}
    </div>
  );
}

export function ReportsLayoutClient({ children }: { children: ReactNode }) {
  return (
    <ReportsOverviewProvider>
      <ReportsLayoutInner>{children}</ReportsLayoutInner>
    </ReportsOverviewProvider>
  );
}
