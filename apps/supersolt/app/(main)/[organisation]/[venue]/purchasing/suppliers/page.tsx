import { SuppliersPageClient } from "@/entities/suppliers/components/suppliers-page";

export default async function PurchasingSuppliersPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <SuppliersPageClient organisation={organisation} venue={venue} />;
}
