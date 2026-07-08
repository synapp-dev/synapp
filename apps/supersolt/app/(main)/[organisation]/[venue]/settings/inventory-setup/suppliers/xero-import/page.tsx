import { XeroImportPageClient } from "@/entities/inventory-setup/components/xero-import-page-client";

export default async function InventorySetupXeroImportPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;
  return <XeroImportPageClient organisation={organisation} venue={venue} />;
}
