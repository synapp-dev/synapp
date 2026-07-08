import { ImportStartPicker } from "@/entities/inventory-setup/components/import-start-picker";

export default async function InventorySetupSuppliersStartPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;
  return <ImportStartPicker organisation={organisation} venue={venue} />;
}
