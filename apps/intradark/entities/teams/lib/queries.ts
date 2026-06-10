import { and, asc, eq, ne, sql } from "drizzle-orm";

import { canonicalPath } from "@/entities/players/lib/resolve";
import { db } from "@/server/db/drizzle";
import {
  playerTeams,
  players,
  steamProfiles,
  teams,
  userProfiles,
} from "@/server/db/schema";

import type { TeamRosterMember, TeamRow, TeamSummary } from "../types";

function mapTeamSummary(row: {
  id: string;
  name: string;
  slug: string;
  avatar: string | null;
}): TeamSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    avatar: row.avatar,
  };
}

function mapTeamRow(row: typeof teams.$inferSelect): TeamRow {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nickname: row.nickname,
    avatar: row.avatar,
    description: row.description,
    coverImage: row.coverImage,
    leaderSteamid64: row.leaderSteamid64,
    game: row.game,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getTeamBySlug(slug: string): Promise<TeamRow | null> {
  const normalized = slug.trim().toLowerCase();
  const rows = await db
    .select()
    .from(teams)
    .where(sql`LOWER(${teams.slug}) = ${normalized}`)
    .limit(1);
  const row = rows[0];
  return row ? mapTeamRow(row) : null;
}

export async function isTeamSlugTaken(slug: string, excludeId?: string) {
  const normalized = slug.trim().toLowerCase();
  const row = await db
    .select({ id: teams.id })
    .from(teams)
    .where(
      excludeId
        ? and(
            sql`LOWER(${teams.slug}) = ${normalized}`,
            ne(teams.id, excludeId),
          )
        : sql`LOWER(${teams.slug}) = ${normalized}`,
    )
    .limit(1);
  return row.length > 0;
}

export async function getMyTeamsForUser(
  steamid64: string,
): Promise<TeamSummary[]> {
  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      avatar: teams.avatar,
    })
    .from(playerTeams)
    .innerJoin(teams, eq(playerTeams.teamId, teams.id))
    .where(eq(playerTeams.steamid64, steamid64))
    .orderBy(asc(teams.name));

  return rows.map(mapTeamSummary);
}

export async function getTeamRoster(teamId: string): Promise<TeamRosterMember[]> {
  const rows = await db
    .select({
      steamid64: playerTeams.steamid64,
      role: playerTeams.role,
      joinedAt: playerTeams.joinedAt,
      username: userProfiles.username,
      displayName: userProfiles.displayName,
      steamPersona: steamProfiles.personaname,
      steamAvatar: steamProfiles.avatarfull,
      faceitNickname: players.faceitNickname,
    })
    .from(playerTeams)
    .innerJoin(players, eq(playerTeams.steamid64, players.steamid64))
    .leftJoin(userProfiles, eq(players.userProfileId, userProfiles.id))
    .leftJoin(steamProfiles, eq(players.steamid64, steamProfiles.steamid64))
    .where(eq(playerTeams.teamId, teamId))
    .orderBy(
      sql`CASE WHEN ${playerTeams.role} = 'leader' THEN 0 ELSE 1 END`,
      asc(playerTeams.joinedAt),
    );

  return rows.map((row) => {
    const displayName =
      row.displayName ||
      row.steamPersona ||
      row.faceitNickname ||
      row.steamid64;
    return {
      steamid64: row.steamid64,
      role: row.role,
      joinedAt: row.joinedAt,
      displayName,
      username: row.username ?? null,
      avatarUrl: row.steamAvatar ?? null,
      profileHref: canonicalPath(row.steamid64, row.username),
    };
  });
}

export async function getTeamById(teamId: string): Promise<TeamRow | null> {
  const rows = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  const row = rows[0];
  return row ? mapTeamRow(row) : null;
}
