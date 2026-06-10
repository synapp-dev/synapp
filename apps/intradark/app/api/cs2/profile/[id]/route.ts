import { NextResponse } from "next/server";

import { isSteamId64 } from "@/entities/players/lib/resolve";
import { enqueueGcIfStale } from "@/entities/players/lib/server/gc";

/**
 * GET /api/cs2/profile/[id]
 * Returns the latest archived CS2 Game Coordinator badge snapshot and, when it
 * is missing or stale, enqueues a job for the cs2-gc-bot worker. The client
 * live-updates via Supabase Realtime on player_cs2_gc_snapshots.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isSteamId64(id)) {
    return NextResponse.json({ error: "Invalid steamid64" }, { status: 400 });
  }

  const { enqueued, latest } = await enqueueGcIfStale(id);

  return NextResponse.json({
    snapshot: latest,
    enqueued,
    pending: enqueued || !latest,
  });
}
