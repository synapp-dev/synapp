import { eq } from "drizzle-orm";

import { checkBearer } from "@/lib/cs2-ingest-auth";
import { finalizeMatch } from "@/entities/match-queue/lib/finalize";
import {
  extractMatchId,
  isFinalizingEvent,
  parseMatchzyResult,
} from "@/entities/match-queue/lib/matchzy";
import { db } from "@/server/db/drizzle";
import { matchEvents, matches } from "@/server/db/schema";

/**
 * MatchZy ingest endpoint (PUG plan §5/§5.1). Appends events to match_events
 * (idempotent) and, on a finalizing event (`map_result`/`series_end`), resolves
 * the match and runs the shared finalizeMatch seam — which applies results, Elo,
 * tournament standings, and the ladder swap. Same seam the manual report uses.
 *
 * Auth: `Authorization: Bearer ${CS2_EVENTS_SECRET}` (fails closed, constant-time).
 * The served MatchZy config sets `matchid` = matches.id (uuid).
 */
export async function POST(req: Request) {
  const auth = checkBearer(
    req.headers.get("authorization"),
    process.env.CS2_EVENTS_SECRET,
  );
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const matchzyMatchId = extractMatchId(raw);
  if (!matchzyMatchId) {
    // Nothing to correlate; ack so MatchZy doesn't retry forever.
    return Response.json({ ok: true, correlated: false });
  }

  const [match] = await db
    .select({ id: matches.id, status: matches.status })
    .from(matches)
    .where(eq(matches.id, matchzyMatchId))
    .limit(1);
  if (!match) {
    return Response.json({ ok: true, correlated: false });
  }

  const eventType =
    (typeof raw.event === "string" && raw.event) ||
    (typeof raw.event_type === "string" && raw.event_type) ||
    "unknown";
  const roundRaw = raw.round_number ?? raw.round;
  const round = typeof roundRaw === "number" ? roundRaw : null;
  const providedId = typeof raw.event_id === "string" ? raw.event_id : null;
  // Dedupe key: explicit id, else a composite unique per (match, type, round).
  const eventId = providedId ?? `${match.id}:${eventType}:${round ?? "_"}`;

  await db
    .insert(matchEvents)
    .values({
      matchId: match.id,
      eventId,
      eventType,
      round,
      raw: raw as never,
    })
    .onConflictDoNothing({ target: matchEvents.eventId });

  if (isFinalizingEvent(raw)) {
    const result = parseMatchzyResult(raw);
    if (result) {
      await finalizeMatch(match.id, result);
      return Response.json({ ok: true, finalized: true });
    }
  }

  return Response.json({ ok: true });
}
