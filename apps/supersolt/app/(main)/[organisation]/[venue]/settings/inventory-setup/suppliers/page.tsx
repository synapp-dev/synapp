import { SuppliersPageClient } from "@/entities/suppliers/components/suppliers-page";

export default async function InventorySetupSuppliersPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <SuppliersPageClient organisation={organisation} venue={venue} hidePageHeader inventorySetupMode />;
}
