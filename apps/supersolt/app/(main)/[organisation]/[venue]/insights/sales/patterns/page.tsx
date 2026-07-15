import { SalesPatternsPageClient } from "@/entities/sales-insights/components/sales-patterns-page";

export default async function SalesPatternsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <SalesPatternsPageClient organisation={organisation} venue={venue} />;
}
