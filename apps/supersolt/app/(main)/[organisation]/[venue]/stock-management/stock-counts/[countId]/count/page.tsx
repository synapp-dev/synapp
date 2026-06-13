import { StockCountFlowPage } from "@/entities/stock-counts/components/stock-count-flow-page";

export default async function StockCountFlowRoute({
  params,
}: {
  params: Promise<{ organisation: string; venue: string; countId: string }>;
}) {
  const { organisation, venue, countId } = await params;
  return (
    <StockCountFlowPage
      organisation={organisation}
      venue={venue}
      countId={countId}
    />
  );
}
