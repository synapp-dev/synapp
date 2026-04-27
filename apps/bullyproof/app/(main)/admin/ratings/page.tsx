import { generateMetadataFromSegments } from "@/utils/metadata";
import { RatingsStagesSection } from "@/entities/dashboard/ui/admin/sections/ratings/ratings-stages-section";

export const metadata = generateMetadataFromSegments(["admin", "ratings"]);

export default function AdminRatingsPage() {
  return <RatingsStagesSection />;
}
