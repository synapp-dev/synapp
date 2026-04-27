import { generateMetadataFromSegments } from "@/utils/metadata";
import { CultureRatingsAdminSection } from "@/entities/dashboard/ui/admin/sections/culture/culture-ratings-admin-section";

export const metadata = generateMetadataFromSegments([
  "admin",
  "culture-ratings",
]);

export default function AdminCultureRatingsPage() {
  return <CultureRatingsAdminSection />;
}
