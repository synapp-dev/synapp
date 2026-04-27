import { generateMetadataFromSegments } from "@/utils/metadata";
import { ReportsCertificationTab } from "@/entities/dashboard/ui/admin/sections/reports/reports-certification-tab";

export const metadata = generateMetadataFromSegments([
  "admin",
  "reports",
  "certification",
]);

export default function AdminReportsCertificationPage() {
  return <ReportsCertificationTab />;
}
