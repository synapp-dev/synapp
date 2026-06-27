import { and, asc, eq } from "drizzle-orm";

import { resolveTeamAvatarUrl } from "@/entities/teams/lib/avatar-url";
import { db } from "@/server/db/drizzle";
import {
  maps,
  playerTeams,
  scrimRegions,
  scrims,
  teamServers,
  teams,
  tiers,
} from "@/server/db/schema";

import type {
  ScrimBootstrap,
  ScrimDetail,
  ScrimMap,
  ScrimRegion,
  ScrimTeam,
  Tier,
  TeamServer,
} from "../types";

function mapScrimMap(row: {
  id: string;
  slug: string;
  displayName: string;
  badgeImageUrl: string | null;
  mapScreenshotUrl: string | null;
}): ScrimMap {
  return {
    id: row.id,
    slug: row.slug,
    name: row.displayName,
    badge: row.badgeImageUrl && row.badgeImageUrl.length > 0 ? row.badgeImageUrl : null,
    screenshot:
      row.mapScreenshotUrl && row.mapScreenshotUrl.length > 0
        ? row.mapScreenshotUrl
        : null,
  };
}

export async function getTiers(): Promise<Tier[]> {
  const rows = await db.select().from(tiers).orderBy(asc(tiers.rank));
  return rows.map((t) => ({
    id: t.id,
    rank: t.rank,
    slug: t.slug,
    name: t.name,
    color: t.color,
    logo: t.logo,
  }));
}

export async function getScrimRegions(): Promise<ScrimRegion[]> {
  const rows = await db.select().from(scrimRegions).orderBy(asc(scrimRegions.name));
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    timezone: r.timezone,
  }));
}

export async function getActiveScrimMaps(): Promise<ScrimMap[]> {
  const rows = await db
    .select({
      id: maps.id,
      slug: maps.slug,
      displayName: maps.displayName,
      badgeImageUrl: maps.badgeImageUrl,
      mapScreenshotUrl: maps.mapScreenshotUrl,
    })
    .from(maps)
    .where(eq(maps.isActive, true))
    .orderBy(asc(maps.sortOrder), asc(maps.displayName));
  return rows.map(mapScrimMap);
}

/** Teams the viewer belongs to, with their scrim tier + region. */
export async function getMyScrimTeams(steamid64: string): Promise<ScrimTeam[]> {
  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      avatar: teams.avatar,
      primaryColor: teams.primaryColor,
      secondaryColor: teams.secondaryColor,
      tierId: teams.tierId,
      regionId: teams.regionId,
    })
    .from(playerTeams)
    .innerJoin(teams, eq(playerTeams.teamId, teams.id))
    .where(eq(playerTeams.steamid64, steamid64))
    .orderBy(asc(teams.name));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    avatar: resolveTeamAvatarUrl(r.avatar),
    primaryColor: r.primaryColor,
    secondaryColor: r.secondaryColor,
    tierId: r.tierId,
    regionId: r.regionId,
  }));
}

/** Bootstrap payload for the scrim shell. */
export async function getScrimBootstrap(
  steamid64: string | null,
): Promise<ScrimBootstrap> {
  const [tierList, regionList, mapList, myTeams] = await Promise.all([
    getTiers(),
    getScrimRegions(),
    getActiveScrimMaps(),
    steamid64 ? getMyScrimTeams(steamid64) : Promise.resolve([]),
  ]);
  return { myTeams, tiers: tierList, regions: regionList, maps: mapList };
}

/** A single confirmed scrim with both teams + the played map. */
export async function getScrimById(id: string): Promise<ScrimDetail | null> {
  const home = teams;
  const rows = await db
    .select({
      id: scrims.id,
      matchTime: scrims.matchTime,
      active: scrims.active,
      scrimCancelId: scrims.scrimCancelId,
      homeId: scrims.homeTeamId,
      awayId: scrims.awayTeamId,
      mapId: scrims.mapId,
    })
    .from(scrims)
    .where(eq(scrims.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const [homeTeam, awayTeam, mapRow] = await Promise.all([
    db
      .select({
        id: home.id,
        name: home.name,
        avatar: home.avatar,
        tierId: home.tierId,
      })
      .from(home)
      .where(eq(home.id, row.homeId))
      .limit(1),
    db
      .select({
        id: teams.id,
        name: teams.name,
        avatar: teams.avatar,
        tierId: teams.tierId,
      })
      .from(teams)
      .where(eq(teams.id, row.awayId))
      .limit(1),
    row.mapId
      ? db
          .select({
            id: maps.id,
            slug: maps.slug,
            displayName: maps.displayName,
            badgeImageUrl: maps.badgeImageUrl,
            mapScreenshotUrl: maps.mapScreenshotUrl,
          })
          .from(maps)
          .where(eq(maps.id, row.mapId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const h = homeTeam[0];
  const a = awayTeam[0];
  if (!h || !a) return null;

  return {
    id: row.id,
    matchTime: row.matchTime,
    active: row.active,
    scrimCancelId: row.scrimCancelId,
    homeTeam: {
      id: h.id,
      name: h.name,
      avatar: resolveTeamAvatarUrl(h.avatar),
      tierId: h.tierId,
    },
    awayTeam: {
      id: a.id,
      name: a.name,
      avatar: resolveTeamAvatarUrl(a.avatar),
      tierId: a.tierId,
    },
    map: mapRow[0] ? mapScrimMap(mapRow[0]) : null,
  };
}

/** Active manual servers for a team (connect details). */
export async function getTeamServers(teamId: string): Promise<TeamServer[]> {
  const rows = await db
    .select()
    .from(teamServers)
    .where(and(eq(teamServers.teamId, teamId), eq(teamServers.status, "active")));
  return rows.map((s) => ({
    id: s.id,
    teamId: s.teamId,
    label: s.label,
    ip: s.ip,
    port: s.port,
    password: s.password,
    status: s.status,
  }));
}
