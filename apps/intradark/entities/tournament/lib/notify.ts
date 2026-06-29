/**
 * Tournament Steam-DM enqueue (plan §9). Inserts `steam_dm_jobs` rows in the
 * `tournament` category for the friends bot to drain. Recipients' notify_tournament
 * preference is re-checked by the worker at send time. The bot worker needs a
 * `tournament` category handler to render these (payload carries `kind` + ids).
 */
import "server-only";

import { eq } from "drizzle-orm";

import { pokeFriendsBot } from "@/entities/notifications/lib/server/steam-dm";
import { db } from "@/server/db/drizzle";
import { competitionEntrantMembers, steamDmJobs } from "@/server/db/schema";

async function memberSteamIds(entrantId: string): Promise<string[]> {
  const rows = await db
    .select({ steamid64: competitionEntrantMembers.steamid64 })
    .from(competitionEntrantMembers)
    .where(eq(competitionEntrantMembers.entrantId, entrantId));
  return rows.map((r) => r.steamid64);
}

/** DM each member of an entrant. dedupKey scopes one send per (kind, target). */
export async function notifyEntrantMembers(args: {
  entrantId: string;
  kind: string;
  dedupScope: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const steamids = await memberSteamIds(args.entrantId);
  if (steamids.length === 0) return;

  await db
    .insert(steamDmJobs)
    .values(
      steamids.map((steamid64) => ({
        kind: "direct" as const,
        category: "tournament" as const,
        steamid64,
        payload: { kind: args.kind, ...args.payload, steamid64 },
        dedupKey: `tournament:${args.dedupScope}:${steamid64}`,
      })),
    )
    .onConflictDoNothing();
  await pokeFriendsBot();
}
