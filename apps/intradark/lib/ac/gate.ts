import "server-only";

import { and, eq, gt, isNotNull } from "drizzle-orm";

import { AC_ACCEPT_FRESHNESS_S } from "@/lib/ac/constants";
import { db } from "@/server/db/drizzle";
import { acSessions } from "@/server/db/schema";

/**
 * Master switch for the accept gate. Default OFF — the league can launch without AC
 * (owner decision, 2026-06-28). Flip AC_GATE_ENABLED=true once the client is
 * distributed and trusted. While off, accept behaves exactly as before.
 */
export function isAcGateEnabled(): boolean {
  return process.env.AC_GATE_ENABLED === "true";
}

/**
 * The accept gate (decision §Q2/Q5): a player is "AC live" iff they have an active
 * session whose last heartbeat is within the freshness window. Read this from the
 * match accept action — no live session ⇒ block accept (queue back-fills).
 *
 * NOTE: this returns the *local* liveness fact. The fail-open-on-backend-down rule
 * (§Q8) lives in the caller: if this query itself throws (DB unreachable), the caller
 * should let play proceed and mark the match "AC-unverified" — NOT block everyone on
 * our own outage.
 */
export async function isAcLive(
  userId: string,
  withinSeconds: number = AC_ACCEPT_FRESHNESS_S,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - withinSeconds * 1000).toISOString();
  const rows = await db
    .select({ id: acSessions.id })
    .from(acSessions)
    .where(
      and(
        eq(acSessions.userId, userId),
        eq(acSessions.status, "active"),
        gt(acSessions.lastHeartbeatAt, cutoff),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Same gate, keyed by SteamID64 (what flows through the match accept path). The
 * client reports its steamid64 in heartbeats, so an active session has it set.
 */
export async function isAcLiveBySteamid64(
  steamid64: string,
  withinSeconds: number = AC_ACCEPT_FRESHNESS_S,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - withinSeconds * 1000).toISOString();
  const rows = await db
    .select({ id: acSessions.id })
    .from(acSessions)
    .where(
      and(
        eq(acSessions.steamid64, steamid64),
        eq(acSessions.status, "active"),
        isNotNull(acSessions.lastHeartbeatAt),
        gt(acSessions.lastHeartbeatAt, cutoff),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
