"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { useSchoolStore } from "@/stores/school-store";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { PAGE_FEATURES } from "@/lib/feature-keys";
import { cultureRatingsSchoolApi } from "@/entities/culture-rating/api/culture-ratings-school-api";
import {
  cultureRatingGaugeScore,
  deriveCultureRatingMetrics,
} from "@/lib/culture-rating-math";

export function CultureRatingDashboardTeaser() {
  const activeSchool = useSchoolStore((s) => s.getActiveSchool());
  const schoolId = activeSchool?.id;
  const slug = activeSchool?.slug;
  const cultureAccess = useFeatureAccess(
    PAGE_FEATURES.SCHOOL_CULTURE_RATING,
    schoolId
  );

  const { data: detail } = useQuery({
    queryKey: ["culture-rating-detail", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const res = await cultureRatingsSchoolApi.getDetail(schoolId);
      if (res.error) return null;
      return res.data;
    },
    enabled: !!schoolId && cultureAccess.hasAccess && !cultureAccess.isLoading,
    staleTime: 60 * 1000,
  });

  if (
    !slug ||
    !schoolId ||
    cultureAccess.isLoading ||
    !cultureAccess.visible
  ) {
    return null;
  }

  const bench = detail?.benchmark;
  const comps = detail?.comparatives ?? [];
  const latest = comps.length ? comps[comps.length - 1] : null;
  const improvement = latest?.improvement ?? null;

  const score =
    bench && latest
      ? cultureRatingGaugeScore({
          comparativeAttendanceRate: deriveCultureRatingMetrics(
            latest.metrics
          ).attendanceRate,
          improvementPercent: improvement?.cultureRatingPercent ?? null,
        })
      : null;

  const performanceHref = `/schools/${slug}/performance`;

  return (
    <Card className="border-[color:var(--brand-bullyproof-primary,#0d9488)]/20">
      <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-bullyproof-primary,#0d9488)]/10">
            <TrendingUp className="h-6 w-6 text-[color:var(--brand-bullyproof-primary,#0d9488)]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Culture rating</p>
            <p className="text-sm text-muted-foreground truncate">
              {!bench
                ? "Benchmark pending — comparisons will appear when ready."
                : latest && score != null
                  ? `Latest comparative: headline score about ${score}. View details on Performance.`
                  : "Enter a comparative period to see your comparison on Performance."}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" asChild>
          <Link href={performanceHref}>View performance</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
