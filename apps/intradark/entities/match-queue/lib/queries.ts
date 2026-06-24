import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import {
  playerQueueCooldowns,
  playerRatings,
  queueEntries,
} from "@/server/db/schema";

import { DEFAULT_RATING, QUEUE_LEAGUES, type QueueLeague } from "./leagues";

/** Live pool size per league (status = 'searching'). Zero-filled for empty leagues. */
export async function getPoolCounts(): Promise<Record<QueueLeague, number>> {
  const rows = await db
    .select({
      league: queueEntries.league,
      n: sql<number>`count(*)::int`,
    })
    .from(queueEntries)
    .where(eq(queueEntries.status, "searching"))
    .groupBy(queueEntries.league);

  const counts = Object.fromEntries(
    QUEUE_LEAGUES.map((l) => [l, 0]),
  ) as Record<QueueLeague, number>;
  for (const r of rows) {
    if ((QUEUE_LEAGUES as readonly string[]).includes(r.league)) {
      counts[r.league as QueueLeague] = Number(r.n);
    }
  }
  return counts;
}

/** The player's current 'searching' or 'matched' entry, if any (newest wins). */
export async function getActiveQueueEntry(steamid64: string) {
  const [row] = await db
    .select()
    .from(queueEntries)
    .where(
      and(
        eq(queueEntries.steamid64, steamid64),
        inArray(queueEntries.status, ["searching", "matched"]),
      ),
    )
    .orderBy(desc(queueEntries.joinedAt))
    .limit(1);
  return row ?? null;
}

/** Internal ELO for matchmaking; DEFAULT_RATING for a player with no rating row. */
export async function getPlayerRating(steamid64: string): Promise<number> {
  const [row] = await db
    .select({ rating: playerRatings.rating })
    .from(playerRatings)
    .where(eq(playerRatings.steamid64, steamid64))
    .limit(1);
  return row?.rating ?? DEFAULT_RATING;
}

/** Unexpired queue cooldown expiry (§4 penalty), or null if none active. */
export async function getActiveCooldownUntil(
  steamid64: string,
): Promise<Date | null> {
  const [row] = await db
    .select({ expiresAt: playerQueueCooldowns.expiresAt })
    .from(playerQueueCooldowns)
    .where(
      and(
        eq(playerQueueCooldowns.steamid64, steamid64),
        sql`${playerQueueCooldowns.expiresAt} > now()`,
      ),
    )
    .orderBy(desc(playerQueueCooldowns.expiresAt))
    .limit(1);
  return row?.expiresAt ? new Date(row.expiresAt) : null;
}
