import { PurchaseOrdersPageClient } from "@/app/(main)/[organisation]/[venue]/inventory/purchase-orders/_components/purchase-orders-page-client";

export default async function PurchaseOrdersPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <PurchaseOrdersPageClient organisation={organisation} venue={venue} />;
}
