"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { ReportExportMenu } from "@/components/molecules/report-export-menu";
import { SchoolPageCompactHeader } from "@/components/molecules/school-page-compact-header";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";
import { useSchoolBySlugQuery } from "@/entities/school/model/useListSchoolsQuery";
import { useSchoolStore } from "@/stores/school-store";
import { usePageTitle } from "@/hooks/use-page-title";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { apiFetch } from "@/lib/api/fetcher.client";
import type { ExportTable } from "@/lib/report-export";

interface ReportsPageClientProps {
  schoolSlug: string;
}

type ReportPack = {
  scope: "school" | "personal";
  tables: ExportTable[];
};

function ReportTableCard({ table }: { table: ExportTable }) {
  const headers = table.rows[0] ? Object.keys(table.rows[0]) : [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{table.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {headers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No data recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => (
                    <TableHead key={header}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map((row, index) => (
                  <TableRow key={index}>
                    {headers.map((header) => (
                      <TableCell key={header} className="whitespace-nowrap">
                        {row[header] == null || row[header] === ""
                          ? "-"
                          : String(row[header])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportsPageClient({ schoolSlug }: ReportsPageClientProps) {
  usePageTitle(["schools", "reports"]);
  const [showContentAnimation, setShowContentAnimation] = useState(false);
  const currentSchool = useSchoolStore((s) => s.currentSchool);
  const { data: school, isLoading } = useSchoolBySlugQuery(schoolSlug, {
    enabled: !!schoolSlug,
  });
  const schoolId = school?.id ?? currentSchool?.id ?? undefined;
  const banner = useStorageImageUrl(currentSchool?.bannerUrl ?? null);
  const avatar = useStorageImageUrl(currentSchool?.avatarUrl ?? null);
  const headerReady =
    !(!!currentSchool?.bannerUrl && banner.loading) &&
    !(!!currentSchool?.avatarUrl && avatar.loading);

  const {
    data: pack,
    isLoading: isLoadingPack,
    error: packError,
  } = useQuery<ReportPack>({
    queryKey: ["schools", schoolSlug, "report-pack"],
    enabled: !!schoolSlug,
    queryFn: async () => {
      const result = await apiFetch<ReportPack>(
        `/schools/${encodeURIComponent(schoolSlug)}/reports/export-pack`
      );
      if (result.error) throw new Error(result.error.message);
      if (!result.data) throw new Error("No report data returned");
      return result.data;
    },
  });

  if (isLoading) {
    return (
      <>
        <FeatureGuard feature="/school/reports" schoolId={schoolId} />
        <div className="space-y-6">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-48 w-full" />
        </div>
      </>
    );
  }

  if (!currentSchool) {
    return (
      <>
        <FeatureGuard feature="/school/reports" schoolId={undefined} />
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">School not found</h1>
            <p className="text-muted-foreground">
              The school you&apos;re looking for doesn&apos;t exist.
            </p>
          </div>
        </div>
      </>
    );
  }

  const isPersonal = pack?.scope === "personal";

  return (
    <FeatureGuard feature="/school/reports" schoolId={currentSchool.id}>
      <div className="space-y-6">
        <SchoolPageCompactHeader
          bannerUrl={banner.url}
          avatarUrl={avatar.url}
          title="Reports"
          description={
            isPersonal
              ? "Your lesson history, certification progress and ratings."
              : "School-level progress, staff and lesson reporting."
          }
          isLoading={!headerReady}
          onAnimationComplete={() => setShowContentAnimation(true)}
        />

        <div
          className={`space-y-6 opacity-0 ${showContentAnimation ? "animate-slide-down-fade-in" : ""}`}
          style={
            showContentAnimation
              ? { animationFillMode: "forwards" }
              : undefined
          }
        >
          <div className="flex justify-end">
            <ReportExportMenu
              filename={
                isPersonal
                  ? "my-bullyproof-report"
                  : `${schoolSlug}-school-report`
              }
              documentTitle={
                isPersonal
                  ? "Bullyproof - My Report"
                  : `Bullyproof - ${currentSchool.name} School Report`
              }
              getTables={() => pack?.tables ?? []}
              disabled={!pack}
            />
          </div>

          {packError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load report data</AlertTitle>
              <AlertDescription>
                {packError instanceof Error
                  ? packError.message
                  : "Please try again later."}
              </AlertDescription>
            </Alert>
          ) : isLoadingPack || !pack ? (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            pack.tables.map((table) => (
              <ReportTableCard key={table.title} table={table} />
            ))
          )}
        </div>
      </div>
    </FeatureGuard>
  );
}
