"use client";

import { BookOpenCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { useReportsOverview } from "@/entities/dashboard/ui/admin/sections/reports/reports-overview-context";
import { usePageTitle } from "@/hooks/use-page-title";

export function ReportsCertificationTab() {
  usePageTitle(["admin", "reports", "certification"]);

  const { overview } = useReportsOverview();
  if (!overview) return null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground max-w-2xl">
        Track AMAYDA programme completion for teachers in scope. Detailed
        per-user progress lives under each school in Admin → Schools.
      </p>

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
  );
}
