"use client";

import { useEffect } from "react";
import { useSchoolStore } from "@/stores/school-store";
import { useSchoolBySlugQuery } from "@/entities/school/model/useListSchoolsQuery";

interface SchoolStoreProviderProps {
  school: {
    id: string;
    name: string;
    slug: string;
    bannerUrl?: string | null;
    avatarUrl?: string | null;
  } | null;
}

export function SchoolStoreProvider({ school }: SchoolStoreProviderProps) {
  const setCurrentSchool = useSchoolStore((state) => state.setCurrentSchool);
  const clearCurrentSchool = useSchoolStore(
    (state) => state.clearCurrentSchool
  );

  // Fetch enriched school details (sector, levels, state) by slug when available
  const { data: detailed } = useSchoolBySlugQuery(school?.slug, {
    enabled: !!school?.slug,
  });

  useEffect(() => {
    if (school) {
      // Merge basic server-provided fields with detailed client-fetched fields when available
      setCurrentSchool({
        id: school.id,
        name: school.name,
        slug: school.slug,
        bannerUrl: school.bannerUrl,
        avatarUrl: school.avatarUrl,
        sector: detailed?.sector ?? null,
        levels: (detailed?.levels as string[] | null) ?? null,
        state: detailed?.state ?? null,
      });
    } else {
      clearCurrentSchool();
    }
  }, [
    school,
    detailed?.sector,
    detailed?.levels,
    detailed?.state,
    setCurrentSchool,
    clearCurrentSchool,
  ]);

  return null; // This component doesn't render anything
}
