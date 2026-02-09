"use client";

import { useEffect, useState } from "react";
import TeachersPageClient from "./teachers-page-client";
import { FeatureGuard } from "@/components/molecules/feature-guard";

export function TeachersPageWrapper({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const [schoolId, setSchoolId] = useState<string>("");

  useEffect(() => {
    params.then(({ school_id }) => setSchoolId(school_id));
  }, [params]);

  return (
    <>
      <FeatureGuard feature="/school/teachers" schoolId={schoolId} />
      <TeachersPageClient />
    </>
  );
}
