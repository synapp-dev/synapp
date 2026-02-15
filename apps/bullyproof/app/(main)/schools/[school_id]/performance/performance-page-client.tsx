"use client";

import { useState } from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { TrendingUp, Lock } from "lucide-react";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { SchoolPageCompactHeader } from "@/components/molecules/school-page-compact-header";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";
import { useSchoolBySlugQuery } from "@/entities/school/model/useListSchoolsQuery";
import { useSchoolStore } from "@/stores/school-store";
import { usePageTitle } from "@/hooks/use-page-title";
import { Skeleton } from "@workspace/ui/components/skeleton";

interface PerformancePageClientProps {
  schoolSlug: string;
}

export function PerformancePageClient({ schoolSlug }: PerformancePageClientProps) {
  usePageTitle(["schools", "performance"]);
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

  if (isLoading) {
    return (
      <>
        <FeatureGuard feature="/school/performance" schoolId={schoolId} />
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
        <FeatureGuard feature="/school/performance" schoolId={undefined} />
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

  return (
    <FeatureGuard feature="/school/performance" schoolId={currentSchool.id}>
      <div className="space-y-6">
        <SchoolPageCompactHeader
          bannerUrl={banner.url}
          avatarUrl={avatar.url}
          title="Performance"
          description="Track your school&apos;s anti-bullying program effectiveness."
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
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="flex items-center justify-center gap-2 mb-4">
                <TrendingUp className="h-16 w-16 text-muted-foreground" />
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <Badge variant="secondary" className="mb-4">
                Coming Soon
              </Badge>
              <h2 className="text-xl font-semibold mb-2">
                Performance stats will be unlocked after Term 1
              </h2>
              <p className="text-muted-foreground">
                Check back after Term 1 to view your school&apos;s performance
                metrics and analytics.
              </p>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </FeatureGuard>
  );
}
