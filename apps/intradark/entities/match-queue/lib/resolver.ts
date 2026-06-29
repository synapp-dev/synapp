import "server-only";

import { and, eq, lt, sql } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import { matches } from "@/server/db/schema";

import { sweepAcKicks } from "@/entities/anticheat/lib/server/kick";

import { resolveAcceptPhase } from "./accept";
import { resolveStaging, startStaging } from "./staging";

/**
 * The time-based heartbeat for the match loop (see docs/pug-match-loop-build-decisions.md §5).
 *
 * Lazy resolution already advances a match whenever someone reads/writes it, so this exists
 * for the "everyone went silent" case — it drives every overdue transition without needing an
 * open browser. Triggered by `/api/cron/resolve` (Vercel Cron / shared-secret). Each match is
 * resolved independently and errors are swallowed per-match so one bad row can't stall the sweep.
 *
 * Every action it calls (`startStaging`, `resolveAcceptPhase`, `resolveStaging`) is idempotent
 * and re-checks status under `FOR UPDATE`, so racing a browser-triggered resolve is safe.
 *
 * P0 scope: accept timeout, staging drive + timeout. The `configuring`/`awaiting_connect`
 * connect-timeout and ephemeral-server teardown land in P4/P6 (marked TODO below).
 */
export type ResolveSweepSummary = {
  staged: number;
  acceptResolved: number;
  stagingResolved: number;
  acKicked: number;
  errors: number;
};

export async function resolveDueMatches(): Promise<ResolveSweepSummary> {
  const summary: ResolveSweepSummary = {
    staged: 0,
    acceptResolved: 0,
    stagingResolved: 0,
    acKicked: 0,
    errors: 0,
  };

  const now = sql`now()`;

  // 1. `accepted` → drive into staging (creates Discord team channels). Idempotent.
  const toStage = await db
    .select({ id: matches.id })
    .from(matches)
    .where(eq(matches.status, "accepted"));

  // 2. `pending_accept` past the accept deadline → resolve (promote or cancel + cooldowns).
  const acceptDue = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        eq(matches.status, "pending_accept"),
        lt(matches.acceptDeadline, now),
      ),
    );

  // 3. `staging` → resolve (advances when all joined OR the staging deadline passed).
  //    Calling it on every staging row is the backstop; it no-ops when not yet ready.
  const stagingActive = await db
    .select({ id: matches.id })
    .from(matches)
    .where(eq(matches.status, "staging"));

  // TODO(P4/P6): `configuring`/`awaiting_connect` past their deadlines → cancel (no penalty for
  // provision failures; no-show penalties for connect timeouts) + tear down the ephemeral server.
  // TODO(P4): reclaim/teardown ephemeral game_servers tied to cancelled/completed matches.

  for (const m of toStage) {
    try {
      await startStaging(m.id);
      summary.staged++;
    } catch (err) {
      summary.errors++;
      console.error("[resolver] startStaging", m.id, err);
    }
  }
  for (const m of acceptDue) {
    try {
      await resolveAcceptPhase(m.id);
      summary.acceptResolved++;
    } catch (err) {
      summary.errors++;
      console.error("[resolver] resolveAcceptPhase", m.id, err);
    }
  }
  for (const m of stagingActive) {
    try {
      await resolveStaging(m.id);
      summary.stagingResolved++;
    } catch (err) {
      summary.errors++;
      console.error("[resolver] resolveStaging", m.id, err);
    }
  }

  // 4. AC in-match enforcement: kick players whose anticheat heartbeat went silent
  //    on a live server (§Q5). No-op unless AC_GATE_ENABLED + a provisioned server.
  try {
    const ac = await sweepAcKicks();
    summary.acKicked = ac.kicked;
  } catch (err) {
    summary.errors++;
    console.error("[resolver] sweepAcKicks", err);
  }

  return summary;
}
