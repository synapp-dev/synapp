import { SalesInsightsPageClient } from "@/entities/sales-insights/components/sales-insights-page";

export default async function SalesInsightsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <SalesInsightsPageClient organisation={organisation} venue={venue} />;
}
