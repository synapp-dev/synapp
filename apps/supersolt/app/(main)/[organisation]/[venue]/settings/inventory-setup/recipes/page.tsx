import { RecipesPageClient } from "@/app/(main)/[organisation]/[venue]/menu/recipes/_components/recipes-page-client";

export default async function InventorySetupRecipesPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <RecipesPageClient organisation={organisation} venue={venue} hidePageHeader />;
}
