"use client";

import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { FileText, Lock } from "lucide-react";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { useSchoolBySlugQuery } from "@/entities/school/model/useListSchoolsQuery";
import { useSchoolStore } from "@/stores/school-store";
import { usePageTitle } from "@/hooks/use-page-title";
import { Skeleton } from "@workspace/ui/components/skeleton";

interface ReportsPageClientProps {
  schoolSlug: string;
}

export function ReportsPageClient({ schoolSlug }: ReportsPageClientProps) {
  usePageTitle(["schools", "reports"]);
  const currentSchool = useSchoolStore((s) => s.currentSchool);
  const { data: school, isLoading } = useSchoolBySlugQuery(schoolSlug, {
    enabled: !!schoolSlug,
  });
  const schoolId = school?.id ?? currentSchool?.id ?? undefined;

  if (isLoading) {
    return (
      <>
        <FeatureGuard feature="/school/reports" schoolId={schoolId} />
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </>
    );
  }

  return (
    <FeatureGuard feature="/school/reports" schoolId={schoolId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Reports
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate and download comprehensive school reports
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="flex items-center justify-center gap-2 mb-4">
                <FileText className="h-16 w-16 text-muted-foreground" />
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <Badge variant="secondary" className="mb-4">
                Coming Soon
              </Badge>
              <h2 className="text-xl font-semibold mb-2">
                Reports will be available after Term 1
              </h2>
              <p className="text-muted-foreground">
                Check back after Term 1 to generate and download school reports.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </FeatureGuard>
  );
}
