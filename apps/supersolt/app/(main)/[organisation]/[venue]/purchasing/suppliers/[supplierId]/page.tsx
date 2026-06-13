import { redirect } from "next/navigation";
import { buildScopedPath } from "@/lib/build-scoped-path";

export default async function PurchasingSupplierDetailPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string; supplierId: string }>;
}) {
  const { organisation, venue, supplierId } = await params;
  const listPath = buildScopedPath(organisation, venue, "purchasing/suppliers");
  redirect(
    `${listPath}?openSupplier=${encodeURIComponent(supplierId)}`,
  );
}
