import { StockCountsListPage } from "@/entities/stock-counts/components/stock-counts-list-page";
import { assertVenueReadinessOrRedirect } from "@/server/readiness/assert-venue-readiness";

export default async function StockCountsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;
  await assertVenueReadinessOrRedirect(organisation, venue, "stock-counts");
  return <StockCountsListPage organisation={organisation} venue={venue} />;
}
