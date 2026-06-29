import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import {
  players,
  reactions,
  steamProfiles,
  userProfiles,
} from "@/server/db/schema";

import { isReactionType, type ReactionTargetType } from "./constants";
import type { ReactionView } from "./types";

/**
 * Load every reaction for a set of targets of one type, grouped by target id.
 * Authors are joined in the same pass (user_profiles → steam_profiles →
 * players) so the client never re-fetches per reactor. Oldest-first within a
 * target; the "latest reactor" used in the summary is the last entry.
 */
export async function getReactionsForTargets(
  targetType: ReactionTargetType,
  targetIds: string[],
): Promise<Map<string, ReactionView[]>> {
  const grouped = new Map<string, ReactionView[]>();
  if (targetIds.length === 0) return grouped;

  const rows = await db
    .select({
      targetId: reactions.targetId,
      userId: reactions.userId,
      reactType: reactions.reactType,
      createdAt: reactions.createdAt,
      username: userProfiles.username,
      displayName: userProfiles.displayName,
      profileAvatar: userProfiles.avatarUrl,
      steamAvatar: steamProfiles.avatarfull,
      steamid64: userProfiles.steamProfileId,
      countryFlag: players.countryFlag,
    })
    .from(reactions)
    .leftJoin(userProfiles, eq(userProfiles.userId, reactions.userId))
    .leftJoin(
      steamProfiles,
      eq(steamProfiles.steamid64, userProfiles.steamProfileId),
    )
    .leftJoin(players, eq(players.steamid64, userProfiles.steamProfileId))
    .where(
      and(
        eq(reactions.targetType, targetType),
        inArray(reactions.targetId, targetIds),
      ),
    )
    .orderBy(asc(reactions.createdAt), asc(reactions.id));

  for (const row of rows) {
    if (!isReactionType(row.reactType)) continue;
    const list = grouped.get(row.targetId) ?? [];
    list.push({
      userId: row.userId,
      reactType: row.reactType,
      createdAt: row.createdAt,
      author: {
        userId: row.userId,
        username: row.username,
        displayName: row.displayName,
        avatarUrl: row.steamAvatar ?? row.profileAvatar ?? null,
        countryFlag: row.countryFlag,
        steamid64: row.steamid64,
      },
    });
    grouped.set(row.targetId, list);
  }

  return grouped;
}

/** Convenience for a single target (entity-level reactions). */
export async function getReactionsForTarget(
  targetType: ReactionTargetType,
  targetId: string,
): Promise<ReactionView[]> {
  const grouped = await getReactionsForTargets(targetType, [targetId]);
  return grouped.get(targetId) ?? [];
}
