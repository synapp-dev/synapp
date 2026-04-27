import { generateMetadataFromSegments } from "@/utils/metadata";
import { ReportsOverviewContent } from "@/entities/dashboard/ui/admin/sections/reports/reports-overview-content";

export const metadata = generateMetadataFromSegments(["admin", "reports"]);

export default function AdminReportsPage() {
  return <ReportsOverviewContent />;
}
