import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import {
  matchPlayers,
  matches,
  playerQueueCooldowns,
  playerRatings,
  players,
  queueEntries,
  steamProfiles,
} from "@/server/db/schema";

import { resolveAcceptPhase } from "./accept";
import { type QueueLeague } from "./leagues";
import { tryFormMatch } from "./matchmaker";

/**
 * Dev-only PUG loop simulator. The HLTV-Top-20-of-2025 seed rows act as bots: they
 * join the queue (so the real §3 matchmaker forms a match), then accept/decline on
 * command (so the real §4 resolution, cooldowns, and requeue logic all fire). All of
 * this writes the real tables — nothing here is mocked, it's just driven by us
 * instead of by 9 humans.
 */

/** The seeded pro bots (synthetic steamid64 block, never collides with real users). */
export const SIM_BOT_STEAMIDS: string[] = Array.from(
  { length: 20 },
  (_, i) => `765611990000002${String(i + 1).padStart(2, "0")}`,
);

export type SimBot = {
  steamid64: string;
  alias: string;
  realName: string | null;
  avatarUrl: string | null;
  country: string | null;
  rating: number;
};

/** Roster of available bots for the sim panel (highest-rated first). */
export async function listSimBots(): Promise<SimBot[]> {
  const rows = await db
    .select({
      steamid64: players.steamid64,
      alias: steamProfiles.personaname,
      vanity: players.steamVanity,
      realName: steamProfiles.realname,
      avatarUrl: steamProfiles.avatarfull,
      country: players.countryFlag,
      rating: playerRatings.rating,
    })
    .from(players)
    .leftJoin(steamProfiles, eq(steamProfiles.steamid64, players.steamid64))
    .leftJoin(playerRatings, eq(playerRatings.steamid64, players.steamid64))
    .where(inArray(players.steamid64, SIM_BOT_STEAMIDS));

  return rows
    .map((r) => ({
      steamid64: r.steamid64,
      alias: r.alias ?? r.vanity ?? "bot",
      realName: r.realName ?? null,
      avatarUrl: r.avatarUrl ?? null,
      country: r.country ?? null,
      rating: r.rating ?? 1000,
    }))
    .sort((a, b) => b.rating - a.rating);
}

/**
 * Drop the given bots into a league's queue (cancelling any stale entry first), then
 * attempt §3 formation. The caller staggers these one-at-a-time to mimic a filling
 * lobby; the match pops on the call that brings the pool to MATCH_SIZE.
 */
export async function queueBots(
  league: QueueLeague,
  steamids: string[],
): Promise<{ matchId: string | null; queued: string[] }> {
  const bots = steamids.filter((s) => SIM_BOT_STEAMIDS.includes(s));
  if (bots.length === 0) return { matchId: null, queued: [] };

  // Clear any leftover active entries so the unique 'one searching per player' holds.
  await db
    .update(queueEntries)
    .set({ status: "cancelled", updatedAt: new Date().toISOString() })
    .where(
      and(
        inArray(queueEntries.steamid64, bots),
        inArray(queueEntries.status, ["searching", "matched"]),
      ),
    );

  const ratings = await db
    .select({ steamid64: playerRatings.steamid64, rating: playerRatings.rating })
    .from(playerRatings)
    .where(inArray(playerRatings.steamid64, bots));
  const ratingOf = new Map(ratings.map((r) => [r.steamid64, r.rating]));

  await db.insert(queueEntries).values(
    bots.map((steamid64) => ({
      steamid64,
      league,
      status: "searching" as const,
      rating: ratingOf.get(steamid64) ?? 1000,
    })),
  );

  const formed = await tryFormMatch(league);
  return { matchId: formed?.matchId ?? null, queued: bots };
}

/** Apply bot accept/decline decisions for a forming match, then re-drive §4. */
export async function setBotDecisions(
  matchId: string,
  accept: string[],
  decline: string[],
): Promise<{ status: string }> {
  const now = new Date().toISOString();

  const acceptBots = accept.filter((s) => SIM_BOT_STEAMIDS.includes(s));
  const declineBots = decline.filter((s) => SIM_BOT_STEAMIDS.includes(s));

  if (acceptBots.length > 0) {
    await db
      .update(matchPlayers)
      .set({ acceptStatus: "accepted", acceptedAt: now })
      .where(
        and(
          eq(matchPlayers.matchId, matchId),
          inArray(matchPlayers.steamid64, acceptBots),
          eq(matchPlayers.acceptStatus, "pending"),
        ),
      );
  }
  if (declineBots.length > 0) {
    await db
      .update(matchPlayers)
      .set({ acceptStatus: "declined" })
      .where(
        and(
          eq(matchPlayers.matchId, matchId),
          inArray(matchPlayers.steamid64, declineBots),
          eq(matchPlayers.acceptStatus, "pending"),
        ),
      );
  }

  const res = await resolveAcceptPhase(matchId);
  return { status: res.status };
}

/**
 * Wipe the sim back to a clean slate for `steamid64`: cancel their queue entry and
 * every bot's, cancel any forming match the bots are in, and clear active cooldowns
 * (so dodge tests don't lock you out of the next run).
 */
export async function resetSim(
  steamid64: string | null,
  opts: { keepCooldowns?: boolean } = {},
): Promise<void> {
  const subjects = steamid64
    ? [steamid64, ...SIM_BOT_STEAMIDS]
    : SIM_BOT_STEAMIDS;

  // Cancel any still-forming matches that contain a bot.
  const forming = await db
    .selectDistinct({ matchId: matchPlayers.matchId })
    .from(matchPlayers)
    .innerJoin(matches, eq(matches.id, matchPlayers.matchId))
    .where(
      and(
        inArray(matchPlayers.steamid64, SIM_BOT_STEAMIDS),
        inArray(matches.status, ["pending_accept", "accepted"]),
      ),
    );
  const formingIds = forming.map((f) => f.matchId);
  if (formingIds.length > 0) {
    await db
      .update(matches)
      .set({
        status: "cancelled",
        cancelReason: "sim_reset",
        updatedAt: new Date().toISOString(),
      })
      .where(inArray(matches.id, formingIds));
  }

  await db
    .update(queueEntries)
    .set({ status: "cancelled", matchId: null, updatedAt: new Date().toISOString() })
    .where(
      and(
        inArray(queueEntries.steamid64, subjects),
        inArray(queueEntries.status, ["searching", "matched"]),
      ),
    );

  if (!opts.keepCooldowns) {
    await db
      .delete(playerQueueCooldowns)
      .where(
        and(
          inArray(playerQueueCooldowns.steamid64, subjects),
          sql`${playerQueueCooldowns.expiresAt} > now()`,
        ),
      );
  }
}
