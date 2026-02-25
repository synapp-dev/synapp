"use client";

import { useEffect, useMemo, useState } from "react";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { useSchoolStore } from "@/stores/school-store";
import { useSchoolBySlugQuery } from "@/entities/school/model/useListSchoolsQuery";
import { usePageTitle } from "@/hooks/use-page-title";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { SettingsClassesCard } from "../components/settings-classes-card";

interface ClassesPageClientProps {
  schoolSlug: string;
}

function toSectorValue(
  sector: unknown
): "government" | "catholic" | "independent" | null {
  if (typeof sector !== "string") return null;
  const value = sector.toLowerCase();
  if (value === "government" || value === "catholic" || value === "independent") {
    return value;
  }
  return null;
}

export function ClassesPageClient({ schoolSlug }: ClassesPageClientProps) {
  usePageTitle(["schools", "settings", "classes"]);
  const currentSchool = useSchoolStore((s) => s.currentSchool);
  const [slug, setSlug] = useState(schoolSlug);

  useEffect(() => {
    setSlug(schoolSlug);
  }, [schoolSlug]);

  const { data: school, isLoading } = useSchoolBySlugQuery(slug, {
    enabled: !!slug,
  });

  const schoolId = school?.id ?? currentSchool?.id ?? null;
  const schoolSector = useMemo(() => toSectorValue(school?.sector), [school?.sector]);
  const schoolLevels = useMemo(
    () =>
      Array.isArray(school?.levels)
        ? school.levels.filter((level): level is string => typeof level === "string")
        : null,
    [school?.levels]
  );

  if (isLoading || !school) {
    return (
      <>
        <FeatureGuard feature="/settings" schoolId={schoolId ?? undefined} />
        <div className="h-[calc(100dvh-4rem-1.5rem)] flex flex-col min-h-0 gap-4">
          <Skeleton className="h-10 w-64 flex-shrink-0" />
          <Skeleton className="h-12 w-full flex-shrink-0" />
          <Skeleton className="flex-1 min-h-0 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <FeatureGuard feature="/settings" schoolId={school.id}>
        <div className="h-[calc(100dvh-4rem-1.5rem)] flex flex-col min-h-0">
          <SettingsClassesCard
            schoolId={school.id}
            schoolSlug={slug}
            schoolName={school.name ?? "School"}
            schoolState={school.state ?? null}
            schoolSector={schoolSector}
            schoolLevels={schoolLevels}
          />
        </div>
      </FeatureGuard>
    </>
  );
}
