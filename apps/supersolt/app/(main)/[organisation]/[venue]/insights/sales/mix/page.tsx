import { SalesMixPageClient } from "@/entities/sales-insights/components/sales-mix-page";

export default async function SalesMixPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <SalesMixPageClient organisation={organisation} venue={venue} />;
}
