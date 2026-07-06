"use client";

import { SchoolActivationTab } from "../../components/school-activation-tab";
import { useSchoolDetail } from "../school-detail-context";

export function SchoolActivationPanel() {
  const { school } = useSchoolDetail();
  return <SchoolActivationTab school={school} />;
}
