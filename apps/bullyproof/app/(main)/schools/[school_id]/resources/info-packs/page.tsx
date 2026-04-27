import { generateMetadataFromSegments } from "@/utils/metadata";
import { ResourceBrowserClient } from "../resource-browser-client";

export const metadata = generateMetadataFromSegments([
  "schools",
  "resources",
  "info-packs",
]);

export default async function LegacyInfoPacksRoute({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;
  return (
    <ResourceBrowserClient
      schoolSlug={school_id}
      initialFolderSegments={["info-packs"]}
    />
  );
}
