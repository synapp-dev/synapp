import { OrdersPageClient } from "@/entities/purchase-orders/components/orders-page";
import { assertVenueReadinessOrRedirect } from "@/server/readiness/assert-venue-readiness";

export default async function PurchasingOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ organisation: string; venue: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { organisation, venue } = await params;
  await assertVenueReadinessOrRedirect(organisation, venue, "purchasing-orders");
  const sp = await searchParams;
  const initialTab = sp.tab === "purchase-orders" ? "purchase-orders" : "guide";

  return (
    <OrdersPageClient
      organisation={organisation}
      venue={venue}
      initialTab={initialTab}
    />
  );
}
