import { InvoicesPageClient } from "@/app/(main)/[organisation]/[venue]/inventory/invoices/_components/invoices-page-client";

export default async function InventoryInvoicesPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <InvoicesPageClient organisation={organisation} venue={venue} />;
}
