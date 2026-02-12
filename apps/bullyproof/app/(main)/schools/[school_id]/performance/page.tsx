import { generateMetadataFromSegments } from "@/utils/metadata";
import { PerformancePageClient } from "./performance-page-client";

export const metadata = generateMetadataFromSegments([
  "schools",
  "performance",
]);

export default async function PerformancePage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;

  return <PerformancePageClient schoolSlug={school_id} />;
}
