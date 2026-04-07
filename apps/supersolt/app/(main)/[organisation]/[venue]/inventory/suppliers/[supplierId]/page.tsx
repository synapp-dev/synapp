import { redirect } from "next/navigation";

/** Deep links open the supplier in the list page bottom sheet. */
export default async function SupplierDetailRedirectPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string; supplierId: string }>;
}) {
  const { organisation, venue, supplierId } = await params;

  redirect(
    `/${organisation}/${venue}/inventory/suppliers?openSupplier=${encodeURIComponent(supplierId)}`
  );
}
