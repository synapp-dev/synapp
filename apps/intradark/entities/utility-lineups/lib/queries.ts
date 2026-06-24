import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import {
  mapCallouts,
  maps,
  mapPools,
  userProfiles,
  utilityLineups,
  utilityMapSpots,
} from "@/server/db/schema";

import type { UtilitySearchFilters } from "./types";

export async function listActiveUtilityMaps() {
  return db
    .select({
      id: maps.id,
      slug: maps.slug,
      displayName: maps.displayName,
      radarImageUrl: maps.radarImageUrl,
      badgeImageUrl: maps.badgeImageUrl,
      mapScreenshotUrl: maps.mapScreenshotUrl,
      sortOrder: maps.sortOrder,
      poolSlug: mapPools.slug,
      poolDisplayName: mapPools.displayName,
    })
    .from(maps)
    .innerJoin(mapPools, eq(maps.poolId, mapPools.id))
    .where(eq(maps.isActive, true))
    .orderBy(
      asc(mapPools.sortOrder),
      asc(maps.sortOrder),
      asc(maps.displayName),
    );
}

export async function getActiveUtilityMapBySlug(slug: string) {
  const rows = await db
    .select()
    .from(maps)
    .where(and(eq(maps.slug, slug), eq(maps.isActive, true)))
    .limit(1);
  return rows[0] ?? null;
}

/** Any map row by slug (includes inactive) — developer tooling. */
export async function getMapBySlugAny(slug: string) {
  const rows = await db.select().from(maps).where(eq(maps.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function listMapCalloutsForMap(mapId: string) {
  return db
    .select()
    .from(mapCallouts)
    .where(eq(mapCallouts.mapId, mapId))
    .orderBy(desc(mapCallouts.priority), asc(mapCallouts.label));
}

export async function listMapsWithPoolsForAdmin() {
  return db
    .select({
      map: maps,
      poolSlug: mapPools.slug,
      poolLabel: mapPools.displayName,
    })
    .from(maps)
    .innerJoin(mapPools, eq(maps.poolId, mapPools.id))
    .orderBy(asc(maps.sortOrder), asc(maps.displayName));
}

export async function listMapPools() {
  return db.select().from(mapPools).orderBy(asc(mapPools.sortOrder));
}

export async function listUtilityMapSpotsForMap(mapId: string) {
  return db
    .select()
    .from(utilityMapSpots)
    .where(eq(utilityMapSpots.mapId, mapId))
    .orderBy(asc(utilityMapSpots.label));
}

/** All spots for admin maps UI (group by `mapId` on the client). */
export async function listAllUtilityMapSpotsForAdmin() {
  return db
    .select()
    .from(utilityMapSpots)
    .orderBy(asc(utilityMapSpots.mapId), asc(utilityMapSpots.label));
}

export type UtilityLineupWithSpotLabels = {
  lineup: typeof utilityLineups.$inferSelect;
  authorDisplayName: string | null;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
};

export async function listPublishedUtilityLineupsForMap(
  mapId: string,
  filters: UtilitySearchFilters,
): Promise<UtilityLineupWithSpotLabels[]> {
  const conditions = [
    eq(utilityLineups.mapId, mapId),
    eq(utilityLineups.status, "published"),
  ];

  if (filters.grenadeType !== "all") {
    conditions.push(eq(utilityLineups.grenadeType, filters.grenadeType));
  }

  if (filters.side === "t") {
    conditions.push(inArray(utilityLineups.side, ["t", "both"]));
  } else if (filters.side === "ct") {
    conditions.push(inArray(utilityLineups.side, ["ct", "both"]));
  }

  return db
    .select({
      lineup: utilityLineups,
      authorDisplayName: userProfiles.displayName,
      authorUsername: userProfiles.username,
      authorAvatarUrl: userProfiles.avatarUrl,
    })
    .from(utilityLineups)
    .leftJoin(userProfiles, eq(utilityLineups.authorProfileId, userProfiles.id))
    .where(and(...conditions));
}

export type RecentUtilityClip = {
  id: string;
  mapSlug: string;
  mapDisplayName: string;
  thumbnailUrl: string;
  grenadeType: string;
  throwLabel: string;
  landLabel: string;
  hasVideo: boolean;
  createdAt: string;
};

/** Newest published lineups (for the news landing "Latest clips" media widget). */
export async function listRecentUtilityClips(
  limit = 4,
): Promise<RecentUtilityClip[]> {
  const rows = await db
    .select({
      id: utilityLineups.id,
      grenadeType: utilityLineups.grenadeType,
      throwLabel: utilityLineups.throwLabel,
      landLabel: utilityLineups.landLabel,
      youtubeUrl: utilityLineups.youtubeUrl,
      videoObjectPath: utilityLineups.videoObjectPath,
      lineupImageUrl: utilityLineups.lineupImageUrl,
      createdAt: utilityLineups.createdAt,
      mapSlug: maps.slug,
      mapDisplayName: maps.displayName,
      mapScreenshotUrl: maps.mapScreenshotUrl,
      radarImageUrl: maps.radarImageUrl,
    })
    .from(utilityLineups)
    .innerJoin(maps, eq(utilityLineups.mapId, maps.id))
    .where(eq(utilityLineups.status, "published"))
    .orderBy(desc(utilityLineups.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    mapSlug: r.mapSlug,
    mapDisplayName: r.mapDisplayName,
    thumbnailUrl:
      r.lineupImageUrl?.trim() ||
      r.mapScreenshotUrl?.trim() ||
      r.radarImageUrl,
    grenadeType: r.grenadeType,
    throwLabel: r.throwLabel,
    landLabel: r.landLabel,
    hasVideo: Boolean(r.youtubeUrl || r.videoObjectPath),
    createdAt: r.createdAt,
  }));
}

export async function listPendingUtilityLineupsForAdmin() {
  return db
    .select({
      lineup: utilityLineups,
      mapSlug: maps.slug,
      mapDisplayName: maps.displayName,
    })
    .from(utilityLineups)
    .innerJoin(maps, eq(utilityLineups.mapId, maps.id))
    .where(eq(utilityLineups.status, "pending"))
    .orderBy(desc(utilityLineups.createdAt));
}

/** Labels for `/utility` map cards (`map_pools.slug` → display copy). */
export function formatUtilityMapPoolCategory(
  poolSlug: string,
  poolDisplayName: string,
): string {
  switch (poolSlug) {
    case "active_duty":
      return "Active Duty";
    case "reserve":
      return "Reserved";
    case "community":
      return "Community";
    default:
      return poolDisplayName;
  }
}
