import { LabourInsightsPageClient } from "@/app/(main)/[organisation]/[venue]/insights/labour/_components/labour-insights-page-client";

export default async function LabourInsightsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <LabourInsightsPageClient organisation={organisation} venue={venue} />;
}
