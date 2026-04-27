"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { useSchoolStore } from "@/stores/school-store";
import { useSchoolBySlugQuery } from "@/entities/school/model/useListSchoolsQuery";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Button } from "@workspace/ui/components/button";
import { SchoolCultureRatingDataForm } from "@/entities/culture-rating/ui/school-culture-rating-data-form";

interface CultureRatingSettingsPageClientProps {
  schoolSlug: string;
}

export function CultureRatingSettingsPageClient({
  schoolSlug,
}: CultureRatingSettingsPageClientProps) {
  const currentSchool = useSchoolStore((s) => s.currentSchool);
  const [slug, setSlug] = useState(schoolSlug);

  useEffect(() => {
    setSlug(schoolSlug);
  }, [schoolSlug]);

  const { data: school, isLoading } = useSchoolBySlugQuery(slug, {
    enabled: !!slug,
  });
  const schoolId = school?.id ?? currentSchool?.id ?? null;
  const settingsPath = `/schools/${slug}/settings`;
  const performancePath = `/schools/${slug}/performance`;

  if (isLoading || !school) {
    return (
      <>
        <FeatureGuard feature="/settings" schoolId={schoolId ?? undefined} />
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <FeatureGuard feature="/settings" schoolId={school.id}>
        <FeatureGuard feature="/school/culture-rating" schoolId={school.id}>
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <Link href={settingsPath} aria-label="Back to Settings">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={performancePath} className="inline-flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
                  View comparison on Performance
                </Link>
              </Button>
            </div>

            <SchoolCultureRatingDataForm
              pageTitleSegments={["schools", "settings", "culture-rating"]}
              title="Culture rating"
              description="Enter comparative period data and request a culture rating report from Bullyproof."
            />
          </div>
        </FeatureGuard>
      </FeatureGuard>
    </>
  );
}
