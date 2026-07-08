import { NormalisationWizardPage } from "@/entities/inventory-normalisation/components/normalisation-wizard-page";

export default async function InventoryNormaliseWizardPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <NormalisationWizardPage organisation={organisation} venue={venue} />;
}
