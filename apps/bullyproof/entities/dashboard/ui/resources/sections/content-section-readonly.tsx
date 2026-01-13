"use client";

import { ContentSection } from "@/entities/dashboard/ui/admin/sections/content/content-section";

interface ContentSectionReadonlyProps {
  schoolId: string;
}

export function ContentSectionReadonly({
  schoolId,
}: ContentSectionReadonlyProps) {
  return (
    <ContentSection
      isAdmin={false}
      title="Lesson Levels"
      description="Browse lesson levels and topics for the platform."
      basePath={`/schools/${schoolId}/resources/content`}
      schoolId={schoolId}
    />
  );
}
