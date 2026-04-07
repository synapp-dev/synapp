import { Suspense } from "react";
import { SuppliersPageClient } from "@/app/(main)/[organisation]/[venue]/inventory/suppliers/_components/suppliers-page-client";

export default async function InventorySuppliersPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading suppliers…</div>}>
      <SuppliersPageClient organisation={organisation} venue={venue} />
    </Suspense>
  );
}
