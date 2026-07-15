import { SalesForecastPageClient } from "@/entities/sales-insights/components/sales-forecast-page";

export default async function SalesForecastPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <SalesForecastPageClient organisation={organisation} venue={venue} />;
}
