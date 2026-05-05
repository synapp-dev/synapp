import { and, asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/server/db/drizzle";
import {
  maps,
  mapPools,
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
      sortOrder: maps.sortOrder,
    })
    .from(maps)
    .where(eq(maps.isActive, true))
    .orderBy(asc(maps.sortOrder), asc(maps.displayName));
}

export async function getActiveUtilityMapBySlug(slug: string) {
  const rows = await db
    .select()
    .from(maps)
    .where(and(eq(maps.slug, slug), eq(maps.isActive, true)))
    .limit(1);
  return rows[0] ?? null;
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

const throwSpot = alias(utilityMapSpots, "utility_throw_spot");
const landSpot = alias(utilityMapSpots, "utility_land_spot");

export type UtilityLineupWithSpotLabels = {
  lineup: typeof utilityLineups.$inferSelect;
  throwLabel: string;
  landLabel: string;
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
      throwLabel: throwSpot.label,
      landLabel: landSpot.label,
    })
    .from(utilityLineups)
    .innerJoin(throwSpot, eq(utilityLineups.throwSpotId, throwSpot.id))
    .innerJoin(landSpot, eq(utilityLineups.landSpotId, landSpot.id))
    .where(and(...conditions));
}
