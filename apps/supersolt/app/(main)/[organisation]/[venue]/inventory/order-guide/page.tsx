import { OrderGuidePageClient } from "@/app/(main)/[organisation]/[venue]/inventory/order-guide/_components/order-guide-page-client";

export default async function InventoryOrderGuidePage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <OrderGuidePageClient organisation={organisation} venue={venue} />;
}
