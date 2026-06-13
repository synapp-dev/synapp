import { WastePageClient } from "./_components/waste-page-client";
import { assertVenueReadinessOrRedirect } from "@/server/readiness/assert-venue-readiness";

export default async function StockManagementWastePage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;
  await assertVenueReadinessOrRedirect(organisation, venue, "stock-waste");

  return <WastePageClient organisation={organisation} venue={venue} />;
}
