"use client";

import {
  SchoolDetailsForm,
  type SchoolForDetailsForm,
} from "@/entities/school/ui/school-details-form";
import { useSchoolDetail } from "../school-detail-context";

export function SchoolDetailsPanel() {
  const { school, onSchoolUpdate } = useSchoolDetail();

  return (
    <div className="space-y-6">
      <SchoolDetailsForm
        school={school as SchoolForDetailsForm}
        onSchoolUpdate={onSchoolUpdate}
      />
    </div>
  );
}
