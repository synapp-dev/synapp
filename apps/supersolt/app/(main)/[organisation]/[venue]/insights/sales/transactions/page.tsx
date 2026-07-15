import { SalesTransactionsPageClient } from "@/entities/sales-insights/components/sales-transactions-page";

export default async function SalesTransactionsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return (
    <SalesTransactionsPageClient organisation={organisation} venue={venue} />
  );
}
