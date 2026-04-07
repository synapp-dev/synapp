import { IngredientsPageClient } from "@/app/(main)/[organisation]/[venue]/menu/ingredients/_components/ingredients-page-client";

export default async function IngredientsPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return <IngredientsPageClient organisation={organisation} venue={venue} />;
}
