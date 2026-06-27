import { NextResponse } from "next/server";

import { resolveDueMatches } from "@/entities/match-queue/lib/resolver";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Match-loop heartbeat (see docs/pug-match-loop-build-decisions.md §5). Sweeps every overdue
 * time-based transition — accept timeout, staging drive/timeout, and (P4+) connect timeout +
 * ephemeral-server teardown — so nothing depends on an open browser. Lazy resolution stays as
 * the latency optimisation while clients are active.
 *
 * Trigger-agnostic: protected by `CRON_SECRET` (Vercel Cron sends `Authorization: Bearer
 * ${CRON_SECRET}` automatically; pg_cron+pg_net could POST the same header for sub-minute cadence).
 * Fails closed if the secret is unset. Idempotent — safe to call as often as you like.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await resolveDueMatches();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("[cron/resolve]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 },
    );
  }
}
