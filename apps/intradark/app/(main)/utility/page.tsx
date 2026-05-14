import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { UtilityMapList } from "@/entities/utility-lineups/components/utility-map-list";
import {
  formatUtilityMapPoolCategory,
  listActiveUtilityMaps,
} from "@/entities/utility-lineups/lib/queries";

export default async function UtilityPage() {
  const maps = await listActiveUtilityMaps();

  return (
    <MainSectionShell
      title="Utility"
      description="Lineups, setups, and practical in-round tools — pick a map to browse grenades."
    >
      <UtilityMapList
        maps={maps.map((m) => ({
          slug: m.slug,
          displayName: m.displayName,
          poolSlug: m.poolSlug,
          badgeImageUrl: m.badgeImageUrl || undefined,
          mapScreenshotUrl: m.mapScreenshotUrl?.trim() || undefined,
          poolCategory: formatUtilityMapPoolCategory(
            m.poolSlug,
            m.poolDisplayName,
          ),
        }))}
      />
    </MainSectionShell>
  );
}
