"use client";

import { useEffect } from "react";
import { useSchoolStore } from "@/stores/school-store";
import { useSchoolBySlugQuery } from "@/entities/school/model/useListSchoolsQuery";

interface SchoolStoreProviderProps {
  slug: string | null;
}

export function SchoolStoreProvider({ slug }: SchoolStoreProviderProps) {
  const setCurrentSchool = useSchoolStore((state) => state.setCurrentSchool);
  const clearCurrentSchool = useSchoolStore(
    (state) => state.clearCurrentSchool
  );

  // Fetch school details by slug
  const { data: school, isLoading, error } = useSchoolBySlugQuery(slug ?? null, {
    enabled: !!slug,
  });

  useEffect(() => {
    if (school) {
      setCurrentSchool({
        id: school.id ?? "",
        name: school.name ?? "",
        slug: school.slug ?? slug ?? "",
        status: school.status,
        bannerUrl: school.bannerUrl ?? null,
        avatarUrl: school.avatarUrl ?? null,
        sector: school.sector ?? null,
        levels: (school.levels as unknown as string[] | null) ?? null,
        state: school.state ?? null,
      });
    } else if (!isLoading && !slug) {
      // Only clear if we're not loading and there's no slug
      clearCurrentSchool();
    }
  }, [
    school,
    slug,
    isLoading,
    setCurrentSchool,
    clearCurrentSchool,
  ]);

  return null; // This component doesn't render anything
}
