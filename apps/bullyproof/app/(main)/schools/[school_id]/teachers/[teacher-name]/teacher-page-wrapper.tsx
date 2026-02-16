"use client";

import { useEffect, useState } from "react";
import TeacherPageClient from "./teacher-page-client";
import { FeatureGuard } from "@/components/molecules/feature-guard";

export function TeacherPageWrapper({
  params,
}: {
  params: Promise<{ school_id: string; "teacher-name": string }>;
}) {
  const [resolved, setResolved] = useState<{
    schoolSlug: string;
    teacherSlug: string;
  }>({ schoolSlug: "", teacherSlug: "" });

  useEffect(() => {
    params.then(({ school_id, "teacher-name": teacherName }) => {
      setResolved({
        schoolSlug: school_id,
        teacherSlug: teacherName,
      });
    });
  }, [params]);

  return (
    <>
      <FeatureGuard feature="/school/teachers" schoolId={resolved.schoolSlug} />
      <TeacherPageClient
        teacherSlug={resolved.teacherSlug}
        schoolSlug={resolved.schoolSlug}
      />
    </>
  );
}
