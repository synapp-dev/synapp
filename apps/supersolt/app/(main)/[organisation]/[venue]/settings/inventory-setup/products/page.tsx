import { PosCatalogImportPage } from "@/entities/pos-catalog-import/components/pos-catalog-import-page";
import { PosCatalogImportProvider } from "@/entities/pos-catalog-import/components/pos-catalog-import-provider";

export default async function PosItemsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return (
    <PosCatalogImportProvider>
      <PosCatalogImportPage organisationSlug={organisation} venueSlug={venue} />
    </PosCatalogImportProvider>
  );
}
