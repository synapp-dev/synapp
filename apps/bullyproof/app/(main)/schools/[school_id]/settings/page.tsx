import { generateMetadataFromSegments } from "@/utils/metadata";
import { SettingsPageClient } from "./settings-page-client";

export const metadata = generateMetadataFromSegments(["schools", "settings"]);

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;

  return <SettingsPageClient schoolSlug={school_id} />;
}
