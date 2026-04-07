import { SalesInsightsPageClient } from "@/app/(main)/[organisation]/[venue]/insights/sales/_components/sales-insights-page-client";

export default async function SalesInsightsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <SalesInsightsPageClient organisation={organisation} venue={venue} />;
}
