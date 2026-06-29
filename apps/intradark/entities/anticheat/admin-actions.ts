"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { ROLE_DEVELOPER } from "@/entities/admin/lib/rbac-constants";
import { hasRoleSlug } from "@/entities/admin/lib/role-slugs";
import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { recomputeLegitimacy } from "@/entities/players/lib/server/recompute-legitimacy";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { db } from "@/server/db/drizzle";
import {
  acEvents,
  acFlags,
  steamProfiles,
  userProfiles,
} from "@/server/db/schema";

/**
 * Admin review queue for anticheat flags. Confirming a flag is the ONLY path by
 * which an AC finding feeds the legitimacy score — nothing auto-bans (§Q7). A ban
 * is still a separate human action; confirming just records the verdict + nudges
 * the score.
 */

export type AcFlagRow = {
  flagId: string;
  status: string;
  severity: string;
  createdAt: string;
  resolution: string | null;
  userId: string;
  eventKind: string | null;
  eventSeverity: string | null;
  eventPayload: unknown;
  steamid64: string | null;
  matchId: string | null;
  persona: string | null;
};

async function requireDeveloper(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Unauthorized");
  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!hasRoleSlug(slugs, ROLE_DEVELOPER)) throw new Error("Forbidden");
  return userId;
}

export async function listAcFlags(): Promise<AcFlagRow[]> {
  await requireDeveloper();
  const rows = await db
    .select({
      flagId: acFlags.id,
      status: acFlags.status,
      severity: acFlags.severity,
      createdAt: acFlags.createdAt,
      resolution: acFlags.resolution,
      userId: acFlags.userId,
      eventKind: acEvents.kind,
      eventSeverity: acEvents.severity,
      eventPayload: acEvents.payload,
      steamid64: acEvents.steamid64,
      matchId: acEvents.matchId,
      persona: steamProfiles.personaname,
    })
    .from(acFlags)
    .leftJoin(acEvents, eq(acEvents.id, acFlags.eventId))
    .leftJoin(steamProfiles, eq(steamProfiles.steamid64, acEvents.steamid64))
    .orderBy(
      // Open first, then reviewing, then resolved; newest within each.
      sql`case ${acFlags.status} when 'open' then 0 when 'reviewing' then 1 else 2 end`,
      desc(acFlags.createdAt),
    )
    .limit(500);
  return rows;
}

/** Resolve the SteamID64 for a flag (event steamid, else the user's linked Steam). */
async function steamidForFlag(
  userId: string,
  eventSteamid: string | null,
): Promise<string | null> {
  if (eventSteamid) return eventSteamid;
  const [profile] = await db
    .select({ steamid64: userProfiles.steamProfileId })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return profile?.steamid64 ?? null;
}

export async function reviewAcFlag(
  flagId: string,
  decision: "confirm" | "dismiss",
  resolution?: string,
): Promise<{ ok: boolean }> {
  const reviewerId = await requireDeveloper();

  const [flag] = await db
    .select({ userId: acFlags.userId, eventId: acFlags.eventId })
    .from(acFlags)
    .where(eq(acFlags.id, flagId))
    .limit(1);
  if (!flag) return { ok: false };

  const status = decision === "confirm" ? "confirmed" : "dismissed";
  await db
    .update(acFlags)
    .set({
      status,
      reviewedBy: reviewerId,
      resolution: resolution ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(acFlags.id, flagId));

  // Confirming nudges the player's legitimacy score (confirmed-only — §Q7).
  if (decision === "confirm") {
    let eventSteamid: string | null = null;
    if (flag.eventId) {
      const [ev] = await db
        .select({ steamid64: acEvents.steamid64 })
        .from(acEvents)
        .where(eq(acEvents.id, flag.eventId))
        .limit(1);
      eventSteamid = ev?.steamid64 ?? null;
    }
    const steamid = await steamidForFlag(flag.userId, eventSteamid);
    if (steamid) await recomputeLegitimacy(steamid).catch(() => null);
  }

  revalidatePath("/admin/anticheat");
  return { ok: true };
}

/** Mark a flag as actively being reviewed (optional triage step). */
export async function claimAcFlag(flagId: string): Promise<{ ok: boolean }> {
  const reviewerId = await requireDeveloper();
  await db
    .update(acFlags)
    .set({ status: "reviewing", reviewedBy: reviewerId, updatedAt: new Date().toISOString() })
    .where(and(eq(acFlags.id, flagId), eq(acFlags.status, "open")));
  revalidatePath("/admin/anticheat");
  return { ok: true };
}
