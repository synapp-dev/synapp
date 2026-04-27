import { generateMetadataFromSegments } from "@/utils/metadata";
import { ReportsLessonsTab } from "@/entities/dashboard/ui/admin/sections/reports/reports-lessons-tab";

export const metadata = generateMetadataFromSegments([
  "admin",
  "reports",
  "lessons",
]);

export default function AdminReportsLessonsPage() {
  return <ReportsLessonsTab />;
}
