import { generateMetadataFromSegments } from "@/utils/metadata";
import { AdminResourcesClient } from "../admin-resources-client";

export const metadata = generateMetadataFromSegments(["admin", "resources"]);

export default async function AdminResourcesFolderPage({
  params,
}: {
  params: Promise<{ folder: string[] }>;
}) {
  const { folder } = await params;
  return <AdminResourcesClient initialFolderSegments={folder ?? []} />;
}
