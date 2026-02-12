import { generateMetadataFromSegments } from "@/utils/metadata";
import { ReportsPageClient } from "./reports-page-client";

export const metadata = generateMetadataFromSegments(["schools", "reports"]);

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;

  return <ReportsPageClient schoolSlug={school_id} />;
}
