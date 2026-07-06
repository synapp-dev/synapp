"use client";

import { SchoolCultureDrawerPanel } from "@/entities/dashboard/ui/admin/sections/culture/school-culture-drawer-panel";
import { useSchoolDetail } from "../school-detail-context";

export function SchoolCulturePanel() {
  const { school } = useSchoolDetail();

  return (
    <div className="space-y-6">
      <SchoolCultureDrawerPanel schoolId={school.id} />
    </div>
  );
}
