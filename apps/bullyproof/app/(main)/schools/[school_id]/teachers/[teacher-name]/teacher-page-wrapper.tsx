"use client";

import { useEffect, useState } from "react";
import TeacherPageClient from "./teacher-page-client";
import { FeatureGuard } from "@/components/molecules/feature-guard";

export function TeacherPageWrapper({
  params,
}: {
  params: Promise<{ school_id: string; "teacher-name": string }>;
}) {
  const [schoolId, setSchoolId] = useState<string>("");
  const [teacherSlug, setTeacherSlug] = useState<string>("");

  useEffect(() => {
    params.then(({ school_id, "teacher-name": slug }) => {
      setSchoolId(school_id);
      setTeacherSlug(slug);
    });
  }, [params]);

  return (
    <>
      <FeatureGuard feature="/school/teachers" schoolId={schoolId} />
      <TeacherPageClient teacherSlug={teacherSlug} schoolSlug={schoolId} />
    </>
  );
}
