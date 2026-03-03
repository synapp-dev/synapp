import { generateMetadataFromSegments } from "@/utils/metadata";
import { CertificationPageClient } from "./certification-page-client";

export const metadata = generateMetadataFromSegments([
  "schools",
  "settings",
  "certification",
]);

export default async function SettingsCertificationPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;
  return <CertificationPageClient schoolSlug={school_id} />;
}
