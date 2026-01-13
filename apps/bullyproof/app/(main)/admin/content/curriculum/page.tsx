import { ContentSection } from "@/entities/dashboard/ui/admin/sections/content/content-section";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments([
  "admin",
  "content",
  "curriculum",
]);

export default function CurriculumPage() {
  return (
    <ContentSection
      isAdmin={true}
      title="Curriculum Stages"
      description="Manage and view curriculum stages for the platform."
      basePath="/admin/content/curriculum"
    />
  );
}
