import { StockCountDetailPage } from "@/entities/stock-counts/components/stock-count-detail-page";

export default async function StockCountDetailRoute({
  params,
}: {
  params: Promise<{ organisation: string; venue: string; countId: string }>;
}) {
  const { organisation, venue, countId } = await params;
  return (
    <StockCountDetailPage
      organisation={organisation}
      venue={venue}
      countId={countId}
    />
  );
}
