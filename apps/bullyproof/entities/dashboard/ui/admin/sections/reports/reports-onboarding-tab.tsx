"use client";

import { Building2, School } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { OnboardingIdleSchoolsTable } from "@/entities/dashboard/ui/admin/sections/reports/onboarding-idle-schools-table";
import { useReportsOverview } from "@/entities/dashboard/ui/admin/sections/reports/reports-overview-context";
import { usePageTitle } from "@/hooks/use-page-title";

export function ReportsOnboardingTab() {
  usePageTitle(["admin", "reports", "onboarding"]);

  const { overview } = useReportsOverview();
  if (!overview) return null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground max-w-2xl">
        School readiness: accounts, licences, and active schools that have not
        created any lessons yet.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      {overview.scope === "platform" &&
      overview.idleActiveSchoolsCount !== null &&
      overview.idleActiveSchoolsCount > 0 ? (
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Active schools with no lessons yet
            </h2>
            <p className="text-sm text-muted-foreground">
              {overview.idleActiveSchoolsCount} school
              {overview.idleActiveSchoolsCount === 1 ? "" : "s"} with an ACTIVE
              licence and no lesson records (all rows from this report).
              Days counts whole calendar days since the ACTIVE licence start
              date. Status reflects permission templates:{" "}
              <span className="font-medium">Active</span> when full school
              unlock applies, <span className="font-medium">Certification</span>{" "}
              when the certification unlock template matches (and not full
              unlock), otherwise <span className="font-medium">Locked</span>.
              Click a row for links.
            </p>
          </div>
          <OnboardingIdleSchoolsTable rows={overview.idleSchools} />
        </div>
      ) : null}
    </div>
  );
}
