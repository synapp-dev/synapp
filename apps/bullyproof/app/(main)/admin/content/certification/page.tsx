import { CertificationContentSection } from "@/entities/dashboard/ui/admin/sections/content/certification-content-section";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments([
  "admin",
  "content",
  "certification",
]);

export default function CertificationPage() {
  return (
    <CertificationContentSection
      isAdmin={true}
      title="Certification Stages"
      description="Manage and view certification stages for the platform."
      basePath="/admin/content/certification"
    />
  );
}
