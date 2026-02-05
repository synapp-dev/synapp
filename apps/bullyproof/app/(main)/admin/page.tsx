import { generateMetadataFromSegments } from "@/utils/metadata";
import { AdminPageClient } from "./admin-page-client";

export const metadata = generateMetadataFromSegments(["admin"]);

export default function AdminPage() {
  return <AdminPageClient />;
}
