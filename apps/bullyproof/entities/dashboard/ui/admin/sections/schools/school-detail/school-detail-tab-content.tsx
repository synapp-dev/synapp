"use client";

import { FeatureGuard } from "@/components/molecules/feature-guard";
import { useSchoolDetail } from "./school-detail-context";
import { SchoolActivationPanel } from "./panels/school-activation-panel";
import { SchoolActivityPanel } from "./panels/school-activity-panel";
import { SchoolClassesPanel } from "./panels/school-classes-panel";
import { SchoolCulturePanel } from "./panels/school-culture-panel";
import { SchoolDetailsPanel } from "./panels/school-details-panel";
import { SchoolFeaturesPanel } from "./panels/school-features-panel";
import { SchoolLicencePanel } from "./panels/school-licence-panel";
import { SchoolOnboardingPanel } from "./panels/school-onboarding-panel";
import { SchoolUsersPanel } from "./panels/school-users-panel";

export function SchoolDetailTabContent() {
  const { activeSection } = useSchoolDetail();

  switch (activeSection) {
    case "onboarding":
      return <SchoolOnboardingPanel />;
    case "activation":
      return <SchoolActivationPanel />;
    case "details":
      return <SchoolDetailsPanel />;
    case "users":
      return <SchoolUsersPanel />;
    case "classes":
      return <SchoolClassesPanel />;
    case "activity":
      return <SchoolActivityPanel />;
    case "culture":
      return <SchoolCulturePanel />;
    case "license":
      return <SchoolLicencePanel />;
    case "features":
      return (
        <FeatureGuard feature="/admin/features">
          <SchoolFeaturesPanel />
        </FeatureGuard>
      );
    default:
      return null;
  }
}
