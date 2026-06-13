import { InvoicesPageClient } from "@/entities/invoices/components/invoices-page";

export default async function PurchasingInvoicesPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <InvoicesPageClient organisation={organisation} venue={venue} />;
}
