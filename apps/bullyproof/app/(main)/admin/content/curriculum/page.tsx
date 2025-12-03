import { ContentSection } from "@/entities/dashboard/ui/admin/sections/content/content-section";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments([
  "admin",
  "content",
  "curriculum",
]);

export default function CurriculumPage() {
  return <ContentSection />;
}
