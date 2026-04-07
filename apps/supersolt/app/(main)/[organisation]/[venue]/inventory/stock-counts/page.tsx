import { StockCountsPageClient } from "@/app/(main)/[organisation]/[venue]/inventory/stock-counts/_components/stock-counts-page-client";

export default async function StockCountsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <StockCountsPageClient organisation={organisation} venue={venue} />;
}
