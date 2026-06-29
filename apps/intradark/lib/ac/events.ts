import "server-only";

import { buildEventDedupKey } from "@/lib/ac/dedupe";
import { db } from "@/server/db/drizzle";
import { acEvents } from "@/server/db/schema";

/**
 * Server-side AC event writes (as opposed to client-ingested ones via /api/ac/events).
 * Used by the gate / resolver to record system-observed facts: a match accepted while
 * the AC backend was unreachable (fail-open §Q8), or a player kicked for going silent.
 */

type InsertAcEventArgs = {
  userId: string;
  kind: string;
  severity?: "info" | "low" | "medium" | "high" | "critical";
  steamid64?: string | null;
  matchId?: string | null;
  sessionId?: string | null;
  payload?: Record<string, unknown>;
  /** Stable identifying parts for idempotency. */
  dedupParts?: Record<string, unknown>;
};

export async function insertAcEvent(args: InsertAcEventArgs): Promise<void> {
  await db
    .insert(acEvents)
    .values({
      userId: args.userId,
      kind: args.kind,
      severity: args.severity ?? "info",
      steamid64: args.steamid64 ?? null,
      matchId: args.matchId ?? null,
      sessionId: args.sessionId ?? null,
      payload: args.payload ?? {},
      dedupKey: buildEventDedupKey(
        args.userId,
        args.kind,
        args.dedupParts ?? args.payload ?? {},
      ),
    })
    .onConflictDoNothing({ target: acEvents.dedupKey });
}

/**
 * Mark that a match accept proceeded without a verifiable AC gate because OUR backend
 * was unreachable (§Q8 fail-open). Admin-visible; not a penalty. Best-effort.
 */
export async function recordUnverifiedAccept(
  userId: string,
  steamid64: string,
  matchId: string,
): Promise<void> {
  await insertAcEvent({
    userId,
    steamid64,
    matchId,
    kind: "backend_unverified",
    severity: "info",
    payload: { phase: "accept", reason: "ac_backend_unreachable" },
    dedupParts: { matchId, phase: "accept" },
  });
}
