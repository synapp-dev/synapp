import { WastePageClient } from "@/app/(main)/[organisation]/[venue]/inventory/waste/_components/waste-page-client";

export default async function InventoryWastePage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <WastePageClient organisation={organisation} venue={venue} />;
}
