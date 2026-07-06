"use client";

import { SchoolFeaturesTab } from "../../components/school-features-tab";
import { useSchoolDetail } from "../school-detail-context";

export function SchoolFeaturesPanel() {
  const { school } = useSchoolDetail();
  return <SchoolFeaturesTab school={school} />;
}
