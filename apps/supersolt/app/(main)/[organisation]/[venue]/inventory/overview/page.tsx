import { InventoryOverviewPageClient } from "@/app/(main)/[organisation]/[venue]/inventory/overview/_components/inventory-overview-page-client";

export default async function InventoryOverviewPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <InventoryOverviewPageClient organisation={organisation} venue={venue} />;
}
