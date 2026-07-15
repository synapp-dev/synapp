import { WastePage } from "@/entities/waste/components/waste-page";
import { assertVenueReadinessOrRedirect } from "@/server/readiness/assert-venue-readiness";

export default async function StockManagementWastePage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;
  await assertVenueReadinessOrRedirect(organisation, venue, "stock-waste");

  return <WastePage organisation={organisation} venue={venue} />;
}
