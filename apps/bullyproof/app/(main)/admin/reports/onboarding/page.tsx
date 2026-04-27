import { generateMetadataFromSegments } from "@/utils/metadata";
import { ReportsOnboardingTab } from "@/entities/dashboard/ui/admin/sections/reports/reports-onboarding-tab";

export const metadata = generateMetadataFromSegments([
  "admin",
  "reports",
  "onboarding",
]);

export default function AdminReportsOnboardingPage() {
  return <ReportsOnboardingTab />;
}
