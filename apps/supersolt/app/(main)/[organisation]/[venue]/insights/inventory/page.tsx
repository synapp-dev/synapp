import { InventoryInsightsPageClient } from "@/app/(main)/[organisation]/[venue]/insights/inventory/_components/inventory-insights-page-client";

export default async function InventoryInsightsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <InventoryInsightsPageClient organisation={organisation} venue={venue} />;
}
