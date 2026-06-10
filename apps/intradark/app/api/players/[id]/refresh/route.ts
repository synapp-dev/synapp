import { NextResponse } from "next/server";

import { isSteamId64 } from "@/entities/players/lib/resolve";
import { MANUAL_REFRESH_COOLDOWN_MS } from "@/entities/players/lib/staleness";
import {
  archiveSteam,
  archiveFaceit,
  archiveLeetify,
} from "@/entities/players/lib/server/archive";
import { enqueueGcJob } from "@/entities/players/lib/server/gc";

/**
 * Best-effort in-memory cooldown. Serverless instances are ephemeral, so this
 * throttles bursts per warm instance rather than being a global guarantee.
 */
const lastRefresh = new Map<string, number>();

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}

/**
 * POST /api/players/[id]/refresh
 * Forces a re-fetch of all sources (rate-limited per ip + steamid64).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isSteamId64(id)) {
    return NextResponse.json({ error: "Invalid steamid64" }, { status: 400 });
  }

  const key = `${clientIp(request)}:${id}`;
  const now = Date.now();
  const last = lastRefresh.get(key) ?? 0;
  const elapsed = now - last;

  if (elapsed < MANUAL_REFRESH_COOLDOWN_MS) {
    const retryAfter = Math.ceil((MANUAL_REFRESH_COOLDOWN_MS - elapsed) / 1000);
    return NextResponse.json(
      { error: "rate_limited", retryAfterSeconds: retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  lastRefresh.set(key, now);

  const [steam, faceit, leetify] = await Promise.all([
    archiveSteam(id, { force: true }),
    archiveFaceit(id, { force: true }),
    archiveLeetify(id, { force: true }),
  ]);
  const gcEnqueued = await enqueueGcJob(id);

  return NextResponse.json({
    success: true,
    refreshed: {
      steam: !!steam.data,
      faceit: !!faceit.data,
      leetify: !!leetify.data,
      gcEnqueued,
    },
  });
}
