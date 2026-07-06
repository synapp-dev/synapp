"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { Combobox } from "@/components/molecules/combobox";
import { ReportExportMenu } from "@/components/molecules/report-export-menu";
import type { ExportTable } from "@/lib/report-export";
import {
  ReportsOverviewProvider,
  useReportsOverview,
} from "@/entities/dashboard/ui/admin/sections/reports/reports-overview-context";
import {
  formatDate,
  formatTeacherName,
  pathWithSchool,
} from "@/entities/dashboard/ui/admin/sections/reports/reports-utils";
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

  const activeNav =
    NAV.find(({ href }) => isNavActive(pathname ?? "", href)) ?? NAV[0];
  const scopeLabel = schoolIdFromUrl
    ? (schoolOptions.find((s) => s.id === schoolIdFromUrl)?.name ?? "School")
    : "All schools";

  const buildExportTables = (): ExportTable[] => {
    if (!overview) return [];

    const scopeRow = { Metric: "Scope", Value: scopeLabel };
    const summaryTable: ExportTable = {
      title: "Summary",
      rows: [
        scopeRow,
        { Metric: "Total schools", Value: overview.schoolsTotal },
        {
          Metric: "Schools with active licence",
          Value: overview.schoolsWithActiveLicence,
        },
        { Metric: "Lessons", Value: overview.lessonsTotal },
        { Metric: "Lesson ratings", Value: overview.lessonRatingsTotal },
        {
          Metric: "AMAYDA certifications complete",
          Value: overview.certificationsCompletedTotal,
        },
        {
          Metric: "Idle active schools",
          Value: overview.idleActiveSchoolsCount ?? "n/a",
        },
      ],
    };
    const idleSchoolsTable: ExportTable = {
      title: "Idle active schools",
      rows: overview.idleSchools.map((school) => ({
        School: school.name,
        Status: school.activationStatus,
        "Days since licence start": school.daysSinceActiveLicenceStart ?? "",
        Classes: school.classCount,
        Teachers: school.teacherCount,
      })),
    };
    const recentLessonsTable: ExportTable = {
      title: "Recent lessons",
      rows: overview.recentLessons.map((lesson) => ({
        Lesson: lesson.topicTitle,
        Classes: lesson.classNames ?? "",
        Teacher: formatTeacherName(
          lesson.teacherFirstName,
          lesson.teacherLastName,
        ),
        School: lesson.schoolName,
        Status: lesson.status,
        Created: formatDate(lesson.createdAt),
      })),
    };

    switch (activeNav.href) {
      case "/admin/reports/certification":
        return [
          {
            title: "Certification",
            rows: [
              scopeRow,
              {
                Metric: "AMAYDA certifications complete",
                Value: overview.certificationsCompletedTotal,
              },
            ],
          },
        ];
      case "/admin/reports/onboarding":
        return [summaryTable, idleSchoolsTable];
      case "/admin/reports/lessons":
        return [
          {
            title: "Lessons",
            rows: [
              scopeRow,
              { Metric: "Lessons", Value: overview.lessonsTotal },
              { Metric: "Lesson ratings", Value: overview.lessonRatingsTotal },
            ],
          },
          recentLessonsTable,
        ];
      default:
        return [summaryTable, idleSchoolsTable, recentLessonsTable];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center">
          <FileText className="h-4 w-4 mr-2" />
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        </div>
        <ReportExportMenu
          filename={`bullyproof-report-${activeNav.label.toLowerCase()}`}
          documentTitle={`Bullyproof Reports - ${activeNav.label} (${scopeLabel})`}
          getTables={buildExportTables}
          disabled={!overview}
        />
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
