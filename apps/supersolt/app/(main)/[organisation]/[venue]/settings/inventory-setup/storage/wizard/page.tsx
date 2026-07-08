import { StockLevelsWizardPage } from "@/entities/stock-counts/components/stock-levels-wizard-page";

export default async function StockLevelsWizardRoute({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <StockLevelsWizardPage organisation={organisation} venue={venue} />;
}
