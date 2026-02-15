"use client";

import { ContentSection } from "@/entities/dashboard/ui/admin/sections/content/content-section";

interface ContentSectionReadonlyProps {
  schoolId: string;
  /** When true, hide the built-in header (used when parent provides compact header) */
  hideHeader?: boolean;
}

export function ContentSectionReadonly({
  schoolId,
  hideHeader = false,
}: ContentSectionReadonlyProps) {
  return (
    <ContentSection
      isAdmin={false}
      title="Lesson Levels"
      description="Browse lesson levels and topics for the platform."
      basePath={`/schools/${schoolId}/content`}
      schoolId={schoolId}
      hideHeader={hideHeader}
    />
  );
}
