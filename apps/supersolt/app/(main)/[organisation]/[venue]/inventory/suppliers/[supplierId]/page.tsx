import { redirect } from "next/navigation";
import { buildScopedPath } from "@/lib/build-scoped-path";

export default async function LegacyInventorySupplierDetailPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string; supplierId: string }>;
}) {
  const { organisation, venue, supplierId } = await params;
  redirect(
    buildScopedPath(organisation, venue, `purchasing/suppliers/${supplierId}`),
  );
}
