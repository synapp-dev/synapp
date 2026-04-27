"use client";

import Link from "next/link";
import {
  BarChart3,
  BookOpenCheck,
  Building2,
  ChevronRight,
  School,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { useReportsOverview } from "@/entities/dashboard/ui/admin/sections/reports/reports-overview-context";
import { pathWithSchool } from "@/entities/dashboard/ui/admin/sections/reports/reports-utils";
import { usePageTitle } from "@/hooks/use-page-title";

export function ReportsOverviewContent() {
  usePageTitle(["admin", "reports"]);

  const { overview, schoolIdFromUrl } = useReportsOverview();
  if (!overview) return null;

  const q = schoolIdFromUrl;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Schools</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.schoolsTotal}</div>
            <p className="text-xs text-muted-foreground">
              {overview.scope === "school"
                ? "Selected school record"
                : "Total school accounts"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active licences</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.schoolsWithActiveLicence}
            </div>
            <p className="text-xs text-muted-foreground">
              Distinct schools with ACTIVE licence
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lessons</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.lessonsTotal}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview.scope === "school"
                ? "Lesson records for this school"
                : "Lesson records across all schools"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lesson ratings</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.lessonRatingsTotal}
            </div>
            <p className="text-xs text-muted-foreground">Feedback submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AMAYDA complete</CardTitle>
            <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.certificationsCompletedTotal}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview.scope === "school"
                ? "Teachers at this school with completed AMAYDA"
                : "Users with completed AMAYDA (all schools)"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
          Go deeper
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="transition-colors hover:bg-muted/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Certification</CardTitle>
              <p className="text-sm text-muted-foreground">
                AMAYDA completion and programme metrics.
              </p>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="px-0" asChild>
                <Link
                  href={pathWithSchool("/admin/reports/certification", q)}
                  className="inline-flex items-center gap-1"
                >
                  Open
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-colors hover:bg-muted/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Onboarding</CardTitle>
              <p className="text-sm text-muted-foreground">
                Licences, school activation, and idle accounts.
              </p>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="px-0" asChild>
                <Link
                  href={pathWithSchool("/admin/reports/onboarding", q)}
                  className="inline-flex items-center gap-1"
                >
                  Open
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-colors hover:bg-muted/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lessons</CardTitle>
              <p className="text-sm text-muted-foreground">
                Delivery runs, ratings, and recent sessions.
              </p>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="px-0" asChild>
                <Link
                  href={pathWithSchool("/admin/reports/lessons", q)}
                  className="inline-flex items-center gap-1"
                >
                  Open
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
