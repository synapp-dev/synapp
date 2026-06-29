import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import { matchPlayers, matches, queueEntries, steamDmJobs } from "@/server/db/schema";
import { buildMatchPopJobs, pokeFriendsBot } from "@/entities/notifications/lib/server/steam-dm";

import { getQueueSeasonStage } from "@/entities/tournament/lib/queue-attribution";

import { ACCEPT_WINDOW_SECONDS, MATCH_SIZE, type QueueLeague } from "./leagues";
import { balanceTeams } from "./team-balance";

export type FormedMatch = { matchId: string };

/**
 * §3 match formation. Atomically: lock the MATCH_SIZE oldest 'searching' entries in
 * this league (FOR UPDATE SKIP LOCKED so concurrent ticks never grab the same rows),
 * create a `matches` row in `pending_accept` with a ~30s accept deadline, auto-balance
 * the roster onto two teams (§5), write `match_players`, and flip those queue entries
 * to 'matched'. Returns null (no-op) when fewer than MATCH_SIZE are waiting.
 *
 * Run this after every join; an out-of-band tick can also call it to drain backlog.
 */
export async function tryFormMatch(
  league: QueueLeague,
): Promise<FormedMatch | null> {
  // Attribute the match to this league's live PUG season (steal-points). Resolved
  // outside the tx; null degrades gracefully to an unattributed match.
  const attribution = await getQueueSeasonStage(league).catch(() => null);

  const formed = await db.transaction(async (tx) => {
    const waiting = await tx
      .select({
        id: queueEntries.id,
        steamid64: queueEntries.steamid64,
        rating: queueEntries.rating,
      })
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.status, "searching"),
          eq(queueEntries.league, league),
        ),
      )
      .orderBy(asc(queueEntries.joinedAt))
      .limit(MATCH_SIZE)
      .for("update", { skipLocked: true });

    if (waiting.length < MATCH_SIZE) return null;

    const balanced = balanceTeams(
      waiting.map((w) => ({ steamid64: w.steamid64, rating: w.rating ?? 1000 })),
    );
    const teamOf = new Map<string, 1 | 2>();
    for (const s of balanced.team1) teamOf.set(s, 1);
    for (const s of balanced.team2) teamOf.set(s, 2);

    const acceptDeadline = new Date(
      Date.now() + ACCEPT_WINDOW_SECONDS * 1000,
    ).toISOString();

    const [match] = await tx
      .insert(matches)
      .values({
        league,
        status: "pending_accept",
        acceptDeadline,
        matchSource: "queue",
        seasonId: attribution?.seasonId ?? null,
        stageId: attribution?.stageId ?? null,
      })
      .returning({ id: matches.id });
    if (!match) throw new Error("Failed to create match row");

    await tx.insert(matchPlayers).values(
      waiting.map((w) => ({
        matchId: match.id,
        steamid64: w.steamid64,
        team: teamOf.get(w.steamid64) ?? null,
        ratingAtQueue: w.rating ?? 1000,
      })),
    );

    await tx
      .update(queueEntries)
      .set({ status: "matched", matchId: match.id, updatedAt: new Date().toISOString() })
      .where(
        inArray(
          queueEntries.id,
          waiting.map((w) => w.id),
        ),
      );

    // Enqueue a match-pop DM per roster player (the friends bot re-checks
    // eligibility + drives the accept countdown). Atomic with match creation;
    // the worker is poked after commit. Idempotent via dedup_key.
    await tx
      .insert(steamDmJobs)
      .values(
        buildMatchPopJobs(
          match.id,
          waiting.map((w) => w.steamid64),
          acceptDeadline,
        ),
      )
      .onConflictDoNothing();

    return { matchId: match.id };
  });

  // Poke the friends bot after commit so the match-pop DMs go out immediately
  // (the 30s accept window is far shorter than the 60s cron / 5s poll cadence).
  if (formed) void pokeFriendsBot();

  return formed;
}
