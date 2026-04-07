import { RecipesPageClient } from "./_components/recipes-page-client";

export default async function RecipesPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;




  return (
    <RecipesPageClient organisation={organisation} venue={venue} />
  );
}
