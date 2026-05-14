import { track } from "@vercel/analytics/server";
import { notFound } from "next/navigation";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getRoleSlugsForUser } from "@/entities/admin/lib/get-role-slugs-for-user";
import { hasRoleSlug } from "@/entities/admin/lib/role-slugs";
import { ROLE_DEVELOPER } from "@/entities/admin/lib/rbac-constants";
import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { UtilityMapFiltersBar } from "@/entities/utility-lineups/components/utility-map-filters-bar";
import { UtilityMapRadarClient } from "@/entities/utility-lineups/components/utility-map-radar-client";
import { UtilityLineupUploadButton } from "@/entities/utility-lineups/components/utility-lineup-upload-sheet";
import { clusterLineupsByLandSpot } from "@/entities/utility-lineups/lib/cluster-lineups";
import { normalizeUtilitySearchParams } from "@/entities/utility-lineups/lib/normalize-utility-search-params";
import {
  formatUtilityMapPoolCategory,
  getActiveUtilityMapBySlug,
  listActiveUtilityMaps,
  listPublishedUtilityLineupsForMap,
} from "@/entities/utility-lineups/lib/queries";
import { getUtilityLineupUploadGateForPage } from "@/entities/utility-lineups/lib/utility-lineup-upload-eligibility";

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

  const [lineupRows, authUserId, utilityMaps, uploadGate] = await Promise.all([
    listPublishedUtilityLineupsForMap(map.id, filters),
    getSessionUserId(),
    listActiveUtilityMaps(),
    getUtilityLineupUploadGateForPage(),
  ]);
  const roleSlugs = authUserId ? await getRoleSlugsForUser(authUserId) : [];
  const canEditUtilitySpots = hasRoleSlug(roleSlugs, ROLE_DEVELOPER);

  await track("utility_map_view", { map_slug: mapSlug });

  const clusters = clusterLineupsByLandSpot(
    lineupRows.map((r) => ({
      id: r.lineup.id,
      landSpotX: r.lineup.landSpotX,
      landSpotY: r.lineup.landSpotY,
      landLabel: r.lineup.landLabel,
    })),
  ).map((c) => ({
    clusterKey: c.clusterKey,
    count: c.count,
    lineupIds: c.lineupIds,
    radarX: c.landSpotX,
    radarY: c.landSpotY,
    label: c.landLabel,
    combineSidesVisual: c.combineSidesVisual,
  }));

  const lineupsById = Object.fromEntries(
    lineupRows.map((r) => {
      const L = r.lineup;
      const uploadAuthorAlias =
        r.authorDisplayName?.trim() ||
        r.authorUsername?.trim() ||
        null;
      return [
        L.id,
        {
          id: L.id,
          grenadeType: L.grenadeType,
          side: L.side,
          movement: L.movement,
          technique: L.technique,
          margin: L.margin,
          description: L.description,
          youtubeUrl: L.youtubeUrl ?? null,
          videoObjectPath: L.videoObjectPath ?? null,
          videoStartMs: L.videoStartMs,
          videoEndMs: L.videoEndMs,
          stillStandMs: L.stillStandMs,
          stillThrowMs: L.stillThrowMs,
          stillLandMs: L.stillLandMs,
          grenadeReleaseMs: L.grenadeReleaseMs,
          grenadeBloomMs: L.grenadeBloomMs,
          lineupImageUrl: L.lineupImageUrl,
          setposText: L.setposText,
          throwSpotX: L.throwSpotX,
          throwSpotY: L.throwSpotY,
          landSpotX: L.landSpotX,
          landSpotY: L.landSpotY,
          throwLabel: L.throwLabel,
          landLabel: L.landLabel,
          intradarkVerified: L.intradarkVerified,
          proVerified: L.proVerified,
          uploadAuthorAlias,
          uploadAuthorAvatarUrl: r.authorAvatarUrl ?? null,
        },
      ];
    }),
  );

  return (
    <MainSectionShell title={map.displayName} titleBadgeUrl={map.badgeImageUrl}>
      <div className="min-w-0 space-y-4 lg:sticky lg:top-16 lg:z-10 lg:max-h-[calc(100dvh-5rem)] lg:self-start lg:overflow-y-auto">
        <UtilityMapRadarClient
          mapSlug={map.slug}
          displayName={map.displayName}
          mapBadgeImageUrl={map.badgeImageUrl ?? null}
          radarImageUrl={map.radarImageUrl}
          clusters={clusters}
          lineupsById={lineupsById}
          canEditUtilitySpots={canEditUtilitySpots}
          filters={{
            grenadeType: filters.grenadeType,
            side: filters.side,
          }}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 md:gap-3">
            <UtilityLineupUploadButton
              maps={utilityMaps.map((m) => ({
                id: m.id,
                slug: m.slug,
                displayName: m.displayName,
                poolSlug: m.poolSlug,
                poolCategory: formatUtilityMapPoolCategory(
                  m.poolSlug,
                  m.poolDisplayName,
                ),
                badgeImageUrl: m.badgeImageUrl,
                radarImageUrl: m.radarImageUrl,
                mapScreenshotUrl: m.mapScreenshotUrl,
              }))}
              uploadGate={uploadGate}
              mapSlug={map.slug}
              displayName={map.displayName}
              radarImageUrl={map.radarImageUrl}
              authUserId={authUserId}
            />
            <div className="min-w-0 flex-1">
              <UtilityMapFiltersBar mapSlug={map.slug} filters={filters} />
            </div>
          </div>
        </UtilityMapRadarClient>
      </div>
    </MainSectionShell>
  );
}
