"use client";

import { useEffect, useState } from "react";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { useSchoolStore } from "@/stores/school-store";
import { useSchoolBySlugQuery } from "@/entities/school/model/useListSchoolsQuery";
import { SettingsUsersCard } from "../components/settings-users-card";
import { usePageTitle } from "@/hooks/use-page-title";
import { Skeleton } from "@workspace/ui/components/skeleton";

interface UsersPageClientProps {
  schoolSlug: string;
}

export function UsersPageClient({ schoolSlug }: UsersPageClientProps) {
  usePageTitle(["schools", "settings", "users"]);
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
        <div className="h-[calc(100dvh-4rem-1.5rem)] flex flex-col min-h-0">
          <Skeleton className="h-10 w-64 flex-shrink-0" />
          <Skeleton className="flex-1 min-h-0 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <FeatureGuard feature="/settings" schoolId={school.id}>
        <div className="h-[calc(100dvh-4rem-1.5rem)] flex flex-col min-h-0">
          <SettingsUsersCard
            schoolId={school.id}
            schoolSlug={slug}
            schoolName={school.name ?? "School"}
            basePath={`/schools/${slug}/settings/users`}
          />
        </div>
      </FeatureGuard>
    </>
  );
}
