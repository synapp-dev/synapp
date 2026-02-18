import { generateMetadataFromSegments } from "@/utils/metadata";
import { AdminResourcesClient } from "./admin-resources-client";

export const metadata = generateMetadataFromSegments(["admin", "resources"]);

export default function AdminResourcesPage() {
  return <AdminResourcesClient initialFolderSegments={[]} />;
}
