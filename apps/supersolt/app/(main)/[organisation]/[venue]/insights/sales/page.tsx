import { SalesOverviewPageClient } from "@/entities/sales-insights/components/sales-overview-page";

export default async function SalesInsightsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <SalesOverviewPageClient organisation={organisation} venue={venue} />;
}
