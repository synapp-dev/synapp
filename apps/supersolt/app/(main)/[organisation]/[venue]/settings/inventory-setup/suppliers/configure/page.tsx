import { SupplierConfigurationWizard } from "@/entities/suppliers/components/supplier-configuration-wizard";

export default async function InventorySetupSupplierConfigurePage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <SupplierConfigurationWizard organisation={organisation} venue={venue} />;
}
