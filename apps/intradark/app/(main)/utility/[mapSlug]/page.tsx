import { track } from "@vercel/analytics/server";
import { notFound } from "next/navigation";

import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { UtilityMapRadarClient } from "@/entities/utility-lineups/components/utility-map-radar-client";
import { UtilityMapSidebar } from "@/entities/utility-lineups/components/utility-map-sidebar";
import { clusterLineupsByLandSpot } from "@/entities/utility-lineups/lib/cluster-lineups";
import { normalizeUtilitySearchParams } from "@/entities/utility-lineups/lib/normalize-utility-search-params";
import {
  getActiveUtilityMapBySlug,
  listPublishedUtilityLineupsForMap,
  listUtilityMapSpotsForMap,
} from "@/entities/utility-lineups/lib/queries";

export default async function UtilityMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ mapSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { mapSlug } = await params;
  const rawSearch = await searchParams;
  const filters = normalizeUtilitySearchParams(rawSearch);

  const map = await getActiveUtilityMapBySlug(mapSlug);
  if (!map) {
    notFound();
  }

  const [spots, lineupRows] = await Promise.all([
    listUtilityMapSpotsForMap(map.id),
    listPublishedUtilityLineupsForMap(map.id, filters),
  ]);

  await track("utility_map_view", { map_slug: mapSlug });

  const spotsById = new Map(spots.map((s) => [s.id, s]));

  const clusters = clusterLineupsByLandSpot(
    lineupRows.map((r) => ({
      id: r.lineup.id,
      landSpotId: r.lineup.landSpotId,
    })),
  ).map((c) => {
    const spot = spotsById.get(c.landSpotId);
    return {
      landSpotId: c.landSpotId,
      count: c.count,
      lineupIds: c.lineupIds,
      radarX: spot?.radarX ?? 0,
      radarY: spot?.radarY ?? 0,
      label: spot?.label ?? "Unknown",
    };
  });

  const lineupsById = Object.fromEntries(
    lineupRows.map((r) => {
      const L = r.lineup;
      return [
        L.id,
        {
          id: L.id,
          grenadeType: L.grenadeType,
          side: L.side,
          description: L.description,
          youtubeUrl: L.youtubeUrl,
          videoStartMs: L.videoStartMs,
          videoEndMs: L.videoEndMs,
          lineupImageUrl: L.lineupImageUrl,
          setposText: L.setposText,
          throwLabel: r.throwLabel,
          landLabel: r.landLabel,
          intradarkVerified: L.intradarkVerified,
          proVerified: L.proVerified,
        },
      ];
    }),
  );

  return (
    <MainSectionShell
      title={map.displayName}
      description="Use filters and tap numbered markers where grenades land."
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <UtilityMapSidebar
          mapSlug={map.slug}
          displayName={map.displayName}
          filters={filters}
        />
        <div className="min-w-0 flex-1 space-y-4">
          {lineupRows.length === 0 ? (
            <p className="text-muted-foreground border-border rounded-lg border border-dashed p-6 text-center text-sm">
              No lineups match these filters yet. Try another grenade type or
              side.
            </p>
          ) : null}
          <UtilityMapRadarClient
            mapSlug={map.slug}
            displayName={map.displayName}
            radarImageUrl={map.radarImageUrl}
            clusters={clusters}
            lineupsById={lineupsById}
            filters={{
              grenadeType: filters.grenadeType,
              side: filters.side,
            }}
          />
        </div>
      </div>
    </MainSectionShell>
  );
}
