import { NormalisationQueuePage } from "@/entities/inventory-normalisation/components/normalisation-queue-page";

export default async function InventorySetupNormalisePage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <NormalisationQueuePage organisation={organisation} venue={venue} />;
}
