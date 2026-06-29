import { NextResponse } from "next/server";
import { z } from "zod";

import { buildEventDedupKey } from "@/lib/ac/dedupe";
import { resolveDevice } from "@/lib/ac/device-auth";
import { db } from "@/server/db/drizzle";
import { acEvents, acFlags } from "@/server/db/schema";

/**
 * AC forensic findings ingest. Authenticated by the device token. Idempotent on a
 * composite content key (the client supplies no trustworthy id — see decision §Q9 /
 * MatchZy §5.1). High-severity findings ALSO open an ac_flags review item — nothing
 * auto-bans; a human triages every flag (§Q7).
 */

const MAX_BATCH = 500;

const SEVERITIES = ["info", "low", "medium", "high", "critical"] as const;
const FLAG_SEVERITIES = new Set(["high", "critical"]);

const eventSchema = z.object({
  kind: z.string().min(1).max(64),
  severity: z.enum(SEVERITIES).optional(),
  matchId: z.string().uuid().optional(),
  steamid64: z.string().max(32).optional(),
  signatureId: z.string().uuid().optional(),
  /** Stable identifying fields for idempotency; falls back to payload. */
  dedupParts: z.record(z.string(), z.unknown()).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

const bodySchema = z.object({
  sessionId: z.string().uuid().optional(),
  events: z.array(eventSchema).min(1).max(MAX_BATCH),
});

export async function POST(req: Request) {
  const auth = await resolveDevice(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { sessionId, events } = parsed.data;

  const rows = events.map((e) => {
    const severity = e.severity ?? "info";
    return {
      sessionId: sessionId ?? null,
      userId: auth.userId,
      steamid64: e.steamid64 ?? null,
      matchId: e.matchId ?? null,
      kind: e.kind,
      severity,
      signatureId: e.signatureId ?? null,
      payload: e.payload ?? {},
      dedupKey: buildEventDedupKey(
        auth.userId,
        e.kind,
        e.dedupParts ?? e.payload ?? {},
      ),
    };
  });

  try {
    const inserted = await db
      .insert(acEvents)
      .values(rows)
      .onConflictDoNothing({ target: acEvents.dedupKey })
      .returning({ id: acEvents.id, severity: acEvents.severity });

    // Open a review item for each newly-inserted high-severity finding. Idempotent
    // on event_id so a retried batch never double-flags. NEVER auto-bans.
    const flagRows = inserted
      .filter((row) => FLAG_SEVERITIES.has(row.severity))
      .map((row) => ({
        userId: auth.userId,
        eventId: row.id,
        severity: row.severity,
        status: "open" as const,
      }));

    if (flagRows.length > 0) {
      await db
        .insert(acFlags)
        .values(flagRows)
        .onConflictDoNothing({ target: acFlags.eventId });
    }

    return NextResponse.json({
      ok: true,
      received: events.length,
      inserted: inserted.length,
      flagged: flagRows.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ac/events]", message);
    return NextResponse.json({ ok: false, error: "Insert failed" }, { status: 500 });
  }
}
