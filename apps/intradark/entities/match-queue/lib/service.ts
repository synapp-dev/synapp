import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import { players, queueEntries } from "@/server/db/schema";

import { evaluateEligibility } from "./eligibility";
import { type QueueLeague } from "./leagues";
import { tryFormMatch } from "./matchmaker";
import {
  getActiveCooldownUntil,
  getActiveQueueEntry,
  getPlayerRating,
} from "./queries";

export type JoinQueueArgs = {
  steamid64: string;
  discordUserId: string | null;
  userProfileId: string | null;
  league: QueueLeague;
};

export type JoinQueueResult =
  | {
      ok: true;
      entryId: string;
      league: QueueLeague;
      alreadyQueued: boolean;
      matchId: string | null;
    }
  | { ok: false; reason: string };

/**
 * A queue_entries row FK's public.players(steamid64), but a freshly-signed-in user
 * may only exist in steam_profiles yet — ensure the canonical players row first so
 * matchmaking/identity has a home. No-op if it already exists.
 */
async function ensurePlayerRow(
  steamid64: string,
  userProfileId: string | null,
): Promise<void> {
  await db
    .insert(players)
    .values({ steamid64, userProfileId: userProfileId ?? undefined })
    .onConflictDoNothing();
}

/** §2 join the queue, then immediately attempt §3 formation for this league. */
export async function joinQueue(args: JoinQueueArgs): Promise<JoinQueueResult> {
  const { steamid64, discordUserId, userProfileId, league } = args;

  const cooldownUntil = await getActiveCooldownUntil(steamid64);
  const verdict = evaluateEligibility({
    steamLinked: Boolean(steamid64),
    discordLinked: Boolean(discordUserId),
    cooldownUntil,
    now: new Date(),
  });
  if (!verdict.eligible) {
    return { ok: false, reason: verdict.reason ?? "Not eligible to queue." };
  }

  const existing = await getActiveQueueEntry(steamid64);
  if (existing?.status === "searching") {
    return {
      ok: true,
      entryId: existing.id,
      league: existing.league as QueueLeague,
      alreadyQueued: true,
      matchId: null,
    };
  }
  if (existing?.status === "matched") {
    return { ok: false, reason: "You're already in a forming match." };
  }

  await ensurePlayerRow(steamid64, userProfileId);
  const rating = await getPlayerRating(steamid64);

  const [entry] = await db
    .insert(queueEntries)
    .values({ steamid64, league, rating })
    .returning({ id: queueEntries.id });
  if (!entry) throw new Error("Failed to create queue entry");

  const formed = await tryFormMatch(league);

  return {
    ok: true,
    entryId: entry.id,
    league,
    alreadyQueued: false,
    matchId: formed?.matchId ?? null,
  };
}

/** §2 leave the queue — cancels the player's active 'searching' entry, if any. */
export async function leaveQueue(
  steamid64: string,
): Promise<{ ok: true; left: boolean }> {
  const res = await db
    .update(queueEntries)
    .set({ status: "cancelled", updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(queueEntries.steamid64, steamid64),
        eq(queueEntries.status, "searching"),
      ),
    )
    .returning({ id: queueEntries.id });
  return { ok: true, left: res.length > 0 };
}
