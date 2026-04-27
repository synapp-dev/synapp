import { generateMetadataFromSegments } from "@/utils/metadata";
import { CultureRatingSettingsPageClient } from "./culture-rating-settings-page-client";

export const metadata = generateMetadataFromSegments([
  "schools",
  "settings",
  "culture-rating",
]);

export default async function SettingsCultureRatingPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;

  return <CultureRatingSettingsPageClient schoolSlug={school_id} />;
}
