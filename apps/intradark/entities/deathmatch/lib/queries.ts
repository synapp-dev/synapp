import "server-only";

import { desc } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import { dmPlayerStats } from "@/server/db/schema";

export type DeathmatchLeaderboardRow = Awaited<
  ReturnType<typeof getDeathmatchLeaderboard>
>[number];

/**
 * All-time deathmatch leaderboard, ranked by kills (headshot kills as tiebreak).
 * Reads the `dm_player_stats` view, which derives stats live from dm_kill_events
 * and LEFT JOINs profile data (null for untracked pub players).
 */
export async function getDeathmatchLeaderboard(limit = 100) {
  return db
    .select()
    .from(dmPlayerStats)
    .orderBy(desc(dmPlayerStats.kills), desc(dmPlayerStats.headshotKills))
    .limit(limit);
}
