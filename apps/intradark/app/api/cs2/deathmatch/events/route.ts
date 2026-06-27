import { NextResponse } from "next/server";
import { z } from "zod";

import { checkBearer } from "@/lib/cs2-ingest-auth";
import { db } from "@/server/db/drizzle";
import { dmKillEvents } from "@/server/db/schema";

/**
 * Deathmatch stats batch ingest.
 *
 * The IntradarkDmStats CounterStrikeSharp plugin buffers events to local SQLite
 * and flushes them here in batches (~every 15 min / on map end). Writes go to
 * `dm_kill_events` (service-role, bypasses RLS) and dedupe on the plugin-supplied
 * `eventId` so retried batches never double-count. Fully separate from the
 * reserved `/api/cs2/events` GSI/MatchZy sink. See docs/cs2-stats-leaderboard.md.
 *
 * Auth: `Authorization: Bearer ${CS2_DM_EVENTS_SECRET}` (separate from the
 * GSI/MatchZy `CS2_EVENTS_SECRET`).
 */

const MAX_BATCH = 2000;

const posSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

// SteamIDs are intentionally loose strings (not /^\d{17}$/): DM servers report
// bots and untracked pubbers whose ids aren't canonical. Filter at read time.
const eventSchema = z.object({
  eventId: z.string().min(1).max(128),
  eventType: z.string().min(1).max(64),
  mapName: z.string().max(128).nullish(),
  attackerSteamId64: z.string().max(32).nullish(),
  victimSteamId64: z.string().max(32).nullish(),
  assisterSteamId64: z.string().max(32).nullish(),
  weapon: z.string().max(64).nullish(),
  headshot: z.boolean().nullish(),
  noscope: z.boolean().nullish(),
  penetrated: z.boolean().nullish(),
  distance: z.number().nullish(),
  attackerPos: posSchema.nullish(),
  victimPos: posSchema.nullish(),
  occurredAt: z.string().min(1),
  // Full untrimmed event from the plugin. Defaults to the event itself if omitted.
  raw: z.unknown().optional(),
});

const bodySchema = z.object({
  serverId: z.string().min(1).max(64),
  events: z.array(eventSchema).min(1).max(MAX_BATCH),
});

export async function POST(request: Request) {
  const auth = checkBearer(
    request.headers.get("authorization"),
    process.env.CS2_DM_EVENTS_SECRET,
  );
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
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

  const { serverId, events } = parsed.data;

  // Dedupe within the batch by eventId (keep first); the unique index + ON CONFLICT
  // handles cross-batch dupes, this just avoids redundant rows in one statement.
  const seen = new Set<string>();
  const rows = events
    .filter((e) => !seen.has(e.eventId) && seen.add(e.eventId))
    .map((e) => ({
      eventId: e.eventId,
      serverId,
      mapName: e.mapName ?? null,
      eventType: e.eventType,
      attackerSteamid64: e.attackerSteamId64 ?? null,
      victimSteamid64: e.victimSteamId64 ?? null,
      assisterSteamid64: e.assisterSteamId64 ?? null,
      weapon: e.weapon ?? null,
      headshot: e.headshot ?? null,
      noscope: e.noscope ?? null,
      penetrated: e.penetrated ?? null,
      distance: e.distance ?? null,
      attackerPos: e.attackerPos ?? null,
      victimPos: e.victimPos ?? null,
      raw: e.raw ?? e,
      occurredAt: e.occurredAt,
    }));

  try {
    const inserted = await db
      .insert(dmKillEvents)
      .values(rows)
      .onConflictDoNothing({ target: dmKillEvents.eventId })
      .returning({ id: dmKillEvents.id });

    return NextResponse.json({
      ok: true,
      received: events.length,
      inserted: inserted.length,
      skipped: rows.length - inserted.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[dm-events ingest]", message);
    return NextResponse.json({ ok: false, error: "Insert failed" }, { status: 500 });
  }
}
