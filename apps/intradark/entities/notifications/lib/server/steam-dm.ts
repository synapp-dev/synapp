import "server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import {
  steamDmJobs,
  steamFriends,
  steamNotificationPrefs,
  steamProfiles,
  userProfiles,
} from "@/server/db/schema";

/**
 * Server seam for the Steam friends bot (apps/intradark/steam-friends-bot). The
 * Next app enqueues `steam_dm_jobs` rows and best-effort pokes the worker; the
 * worker drains + sends. Match pops are latency-sensitive so they always poke;
 * scrim jobs are DB-trigger-sourced and rely on the worker's 5s poll.
 */

const BOT_URL =
  process.env.STEAM_FRIENDS_BOT_HTTP_URL || "http://127.0.0.1:3849";
const SECRET = process.env.STEAM_FRIENDS_BOT_HTTP_SECRET;

/** Best-effort nudge to drain now. No-op if the worker is down (it also polls). */
export async function pokeFriendsBot(): Promise<void> {
  if (!SECRET) return;
  try {
    await fetch(`${BOT_URL}/poke`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // worker offline — jobs stay queued and drain when it comes up
  }
}

/** Liveness of the worker, for the admin panel. */
export async function friendsBotHealth(): Promise<{ ok: boolean; ready: boolean }> {
  try {
    const res = await fetch(`${BOT_URL}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      ready?: boolean;
    };
    return { ok: Boolean(data.ok), ready: Boolean(data.ready) };
  } catch {
    return { ok: false, ready: false };
  }
}

export interface BotFriendRow {
  steamid64: string;
  name: string;
  avatar: string | null;
  linked: boolean;
  friendStatus: string;
  addedAt: string;
  lastDmAt: string | null;
}

/** Every account that has added the bot, joined to profile info for display. */
export async function listBotFriends(): Promise<BotFriendRow[]> {
  const rows = await db
    .select({
      steamid64: steamFriends.steamid64,
      userId: steamFriends.userId,
      friendStatus: steamFriends.friendStatus,
      addedAt: steamFriends.addedAt,
      lastDmAt: steamFriends.lastDmAt,
      persona: steamProfiles.personaname,
      avatar: steamProfiles.avatarfull,
      displayName: userProfiles.displayName,
      username: userProfiles.username,
    })
    .from(steamFriends)
    .leftJoin(steamProfiles, eq(steamProfiles.steamid64, steamFriends.steamid64))
    .leftJoin(userProfiles, eq(userProfiles.userId, steamFriends.userId))
    .orderBy(desc(steamFriends.addedAt));

  return rows.map((r) => ({
    steamid64: r.steamid64,
    name: r.displayName ?? r.username ?? r.persona ?? "Unknown",
    avatar: r.avatar ?? null,
    linked: Boolean(r.userId),
    friendStatus: r.friendStatus,
    addedAt: r.addedAt,
    lastDmAt: r.lastDmAt,
  }));
}

/** Enqueue a one-off direct DM to a single friend (admin panel). */
export async function enqueueDirectMessage(
  steamid64: string,
  text: string,
): Promise<void> {
  await db.insert(steamDmJobs).values({
    kind: "direct",
    category: "admin_dm",
    steamid64,
    payload: { steamid64, text },
  });
  await pokeFriendsBot();
}

/**
 * Enqueue a match-pop DM per roster player (eligibility is re-checked by the
 * worker at send time). Idempotent via dedup key. Caller pokes after commit.
 */
export function buildMatchPopJobs(
  matchId: string,
  steamids: string[],
  acceptDeadline: string,
): (typeof steamDmJobs.$inferInsert)[] {
  return steamids.map((steamid64) => ({
    kind: "direct" as const,
    category: "match" as const,
    steamid64,
    payload: { match_id: matchId, steamid64, accept_deadline: acceptDeadline },
    dedupKey: `match:${matchId}:accept:${steamid64}`,
  }));
}

/** Enqueue a published-article broadcast (manual publish only — see plan §6). */
export async function enqueueNewsDm(articleId: string): Promise<void> {
  await db
    .insert(steamDmJobs)
    .values({
      kind: "broadcast",
      category: "news",
      payload: { audience: "news", article_id: articleId },
      dedupKey: `news:${articleId}`,
    })
    .onConflictDoNothing();
  await pokeFriendsBot();
}

/** Enqueue an admin broadcast (optionally a test send to a single steamid64). */
export async function enqueueAdminBroadcast(args: {
  body: string;
  link?: string | null;
  testSteamid64?: string | null;
}): Promise<void> {
  const payload: Record<string, unknown> = {
    audience: "broadcast",
    body: args.body,
  };
  if (args.link) payload.link = args.link;
  if (args.testSteamid64) payload.test_steamid64 = args.testSteamid64;
  await db.insert(steamDmJobs).values({
    kind: "broadcast",
    category: "broadcast",
    payload,
    dedupKey: `broadcast:${randomUUID()}`,
  });
  await pokeFriendsBot();
}

/** How many opted-in friends an admin broadcast would reach (for the confirm UI). */
export async function countBroadcastRecipients(): Promise<number> {
  const friends = await db
    .select({ userId: steamFriends.userId })
    .from(steamFriends)
    .where(
      and(eq(steamFriends.friendStatus, "active"), isNotNull(steamFriends.userId)),
    );
  const ids = friends.map((f) => f.userId).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return 0;

  const off = await db
    .select({ userId: steamNotificationPrefs.userId })
    .from(steamNotificationPrefs)
    .where(
      and(
        inArray(steamNotificationPrefs.userId, ids),
        eq(steamNotificationPrefs.notifyBroadcast, false),
      ),
    );
  const offSet = new Set(off.map((r) => r.userId));
  return ids.filter((id) => !offSet.has(id)).length;
}
