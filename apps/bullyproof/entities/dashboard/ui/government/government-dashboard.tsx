"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BookOpenCheck,
  Landmark,
  School,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { apiFetch } from "@/lib/api/fetcher.client";
import { ReportExportMenu } from "@/components/molecules/report-export-menu";
import type { ExportTable } from "@/lib/report-export";

type GovernmentOverview = {
  schoolsTotal: number;
  schoolsWithActiveLicence: number;
  lessonsTotal: number;
  lessonRatingsTotal: number;
  certificationsCompletedTotal: number;
};

const STATS = [
  {
    key: "schoolsTotal",
    label: "Participating schools",
    description: "Schools registered on the Bullyproof platform",
    icon: School,
  },
  {
    key: "schoolsWithActiveLicence",
    label: "Active schools",
    description: "Schools with an active programme licence",
    icon: ShieldCheck,
  },
  {
    key: "lessonsTotal",
    label: "Lessons delivered",
    description: "Programme lessons recorded across all schools",
    icon: Sparkles,
  },
  {
    key: "lessonRatingsTotal",
    label: "Lesson ratings",
    description: "Teacher feedback submissions on delivered lessons",
    icon: Star,
  },
  {
    key: "certificationsCompletedTotal",
    label: "AP certifications",
    description: "Educators who completed the AMAYDA programme",
    icon: BookOpenCheck,
  },
] as const;

export function GovernmentDashboard() {
  const {
    data: overview,
    isLoading,
    error,
  } = useQuery<GovernmentOverview>({
    queryKey: ["government", "overview"],
    queryFn: async () => {
      const result = await apiFetch<GovernmentOverview>("/government/overview");
      if (result.error) throw new Error(result.error.message);
      if (!result.data) throw new Error("No data returned");
      return result.data;
    },
  });

  const buildExportTables = (): ExportTable[] => {
    if (!overview) return [];
    return [
      {
        title: "Programme summary",
        rows: STATS.map((stat) => ({
          Metric: stat.label,
          Value: overview[stat.key],
        })),
      },
    ];
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">
              Government Reporting
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            View-only summary of the Bullyproof programme across participating
            schools. Figures are platform-wide aggregates.
          </p>
        </div>
        <ReportExportMenu
          filename="bullyproof-government-report"
          documentTitle="Bullyproof Programme - Government Report"
          getTables={buildExportTables}
          disabled={!overview}
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load reporting data</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Please try again later."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading || !overview ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">
                    {overview[stat.key].toLocaleString()}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
