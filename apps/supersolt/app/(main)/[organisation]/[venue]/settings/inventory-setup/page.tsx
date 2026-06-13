import { InventorySetupWizard } from "@/entities/inventory-setup/components/wizard/inventory-setup-wizard";

export default async function InventorySetupIndexPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <InventorySetupWizard organisation={organisation} venue={venue} />;
}
