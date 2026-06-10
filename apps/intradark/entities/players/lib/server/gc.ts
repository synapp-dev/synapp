/**
 * Server-only helpers for the CS2 Game Coordinator badge pipeline.
 * The Next app only enqueues jobs + reads snapshots; the cs2-gc-bot worker
 * (separate process) drains jobs and writes snapshots.
 */

import { createAdminClient } from "@/utils/supabase/admin";
import { ensurePlayer } from "@/entities/players/lib/server/registry";
import { isStale, SOURCE_TTL_MS } from "@/entities/players/lib/staleness";

export interface GcSnapshot {
  fetched_at: string;
  player_level: number | null;
  cmd_friendly: number | null;
  cmd_teaching: number | null;
  cmd_leader: number | null;
  vac_banned: boolean | null;
  medals: unknown;
  rankings: unknown;
}

export async function getLatestGcSnapshot(
  steamid64: string,
): Promise<GcSnapshot | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("player_cs2_gc_snapshots")
    .select(
      "fetched_at, player_level, cmd_friendly, cmd_teaching, cmd_leader, vac_banned, medals, rankings",
    )
    .eq("steamid64", steamid64)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as GcSnapshot | null) ?? null;
}

function botBaseUrl(): string {
  return process.env.CS2_GC_BOT_HTTP_URL ?? "http://127.0.0.1:3848";
}

/** Best-effort nudge to the bot worker to drain immediately (it also polls). */
async function pokeGcBot(steamid64: string): Promise<void> {
  const secret = process.env.CS2_GC_BOT_HTTP_SECRET;
  if (!secret) return;
  try {
    await fetch(`${botBaseUrl()}/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ steamid64 }),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // bot offline — job stays queued and will drain when the worker comes up
  }
}

/**
 * Enqueue a GC fetch for this steamid64 when no job is already in flight.
 * Returns whether a new job was created.
 */
export async function enqueueGcJob(steamid64: string): Promise<boolean> {
  const admin = createAdminClient();

  await ensurePlayer(admin, steamid64);

  const { data: pending } = await admin
    .from("player_cs2_gc_jobs")
    .select("id")
    .eq("steamid64", steamid64)
    .in("status", ["queued", "running"])
    .limit(1)
    .maybeSingle();

  let created = false;
  if (!pending) {
    await admin
      .from("player_cs2_gc_jobs")
      .insert({ steamid64, status: "queued" });
    created = true;
  }

  await pokeGcBot(steamid64);
  return created;
}

/** Enqueue only if the latest snapshot is missing/stale. */
export async function enqueueGcIfStale(
  steamid64: string,
  opts: { force?: boolean } = {},
): Promise<{ enqueued: boolean; latest: GcSnapshot | null }> {
  const latest = await getLatestGcSnapshot(steamid64);
  const stale = opts.force || !latest || isStale(latest.fetched_at, SOURCE_TTL_MS.gc);
  const enqueued = stale ? await enqueueGcJob(steamid64) : false;
  return { enqueued, latest };
}
