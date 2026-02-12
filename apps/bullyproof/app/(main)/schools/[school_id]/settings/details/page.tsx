import { generateMetadataFromSegments } from "@/utils/metadata";
import { DetailsPageClient } from "./details-page-client";

export const metadata = generateMetadataFromSegments([
  "schools",
  "settings",
  "details",
]);

export default async function SettingsDetailsPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;

  return <DetailsPageClient schoolSlug={school_id} />;
}
