"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { useSchoolStore } from "@/stores/school-store";
import { useSchoolBySlugQuery } from "@/entities/school/model/useListSchoolsQuery";
import { SchoolDetailsForm, type SchoolForDetailsForm } from "@/entities/school/ui/school-details-form";
import { usePageTitle } from "@/hooks/use-page-title";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { ArrowLeft } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

interface DetailsPageClientProps {
  schoolSlug: string;
}

export function DetailsPageClient({ schoolSlug }: DetailsPageClientProps) {
  usePageTitle(["schools", "settings", "details"]);
  const currentSchool = useSchoolStore((s) => s.currentSchool);
  const [slug, setSlug] = useState(schoolSlug);

  useEffect(() => {
    setSlug(schoolSlug);
  }, [schoolSlug]);

  const { data: school, isLoading } = useSchoolBySlugQuery(slug, {
    enabled: !!slug,
  });
  const schoolId = school?.id ?? currentSchool?.id ?? null;

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

  const schoolForForm: SchoolForDetailsForm = {
    id: school.id,
    name: school.name ?? "",
    state: school.state ?? null,
    sector: school.sector ?? null,
    levels: Array.isArray(school.levels)
      ? (school.levels as string[])
      : school.levels
        ? [String(school.levels)]
        : null,
    address: (school as { address?: string | null }).address ?? null,
    emailDomain: (school as { emailDomain?: string | null }).emailDomain ?? null,
    bannerUrl: (school as { bannerUrl?: string | null }).bannerUrl ?? null,
    avatarUrl: (school as { avatarUrl?: string | null }).avatarUrl ?? null,
    createdAt: (school as { createdAt?: string | null }).createdAt ?? null,
  };

  const settingsPath = `/schools/${slug}/settings`;

  return (
    <>
      <FeatureGuard feature="/settings" schoolId={school.id}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={settingsPath} aria-label="Back to Settings">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Settings - Details</h1>
              <p className="text-muted-foreground">
                Edit your school&apos;s basic information
              </p>
            </div>
          </div>

          <SchoolDetailsForm
            school={schoolForForm}
            onSchoolUpdate={() => {
              // Refetch handled by query invalidation if needed
            }}
          />
        </div>
      </FeatureGuard>
    </>
  );
}
