import { IngredientsPageClient } from "@/app/(main)/[organisation]/[venue]/menu/ingredients/_components/ingredients-page-client";
import { assertVenueReadinessOrRedirect } from "@/server/readiness/assert-venue-readiness";

export default async function MasterInventoryListPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;
  await assertVenueReadinessOrRedirect(organisation, venue, "menu-ingredients");

  return <IngredientsPageClient organisation={organisation} venue={venue} hidePageHeader />;
}
