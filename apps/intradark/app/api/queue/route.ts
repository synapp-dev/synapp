import { NextResponse } from "next/server";
import { z } from "zod";

import { evaluateEligibility } from "@/entities/match-queue/lib/eligibility";
import { QUEUE_LEAGUES } from "@/entities/match-queue/lib/leagues";
import {
  getActiveCooldownUntil,
  getActiveQueueEntry,
  getPoolCounts,
} from "@/entities/match-queue/lib/queries";
import { joinQueue, leaveQueue } from "@/entities/match-queue/lib/service";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";

/**
 * Faceit-style PUG queue endpoint (docs/pug-system-spec.md §2–§3).
 *   GET    → live pool counts + the caller's active entry + eligibility
 *   POST   → join the queue for a league (immediately attempts match formation)
 *   DELETE → leave the queue
 * Pool counts are public; per-player state requires a signed-in Steam-linked user.
 */

const joinSchema = z.object({
  league: z.enum(QUEUE_LEAGUES),
});

export async function GET() {
  const pool = await getPoolCounts();
  const me = await getCurrentUserProfiles();

  if (!me) {
    return NextResponse.json({
      pool,
      you: null,
      eligibility: { eligible: false, reason: "Sign in to queue." },
    });
  }

  const steamid64 = me.userProfile.steam_profile_id;
  if (!steamid64) {
    return NextResponse.json({
      pool,
      you: null,
      eligibility: { eligible: false, reason: "Link your Steam account to queue." },
    });
  }

  const [entry, cooldownUntil] = await Promise.all([
    getActiveQueueEntry(steamid64),
    getActiveCooldownUntil(steamid64),
  ]);

  const eligibility = evaluateEligibility({
    steamLinked: true,
    discordLinked: Boolean(me.userProfile.discord_user_id),
    cooldownUntil,
    now: new Date(),
  });

  return NextResponse.json({
    pool,
    you: entry
      ? { status: entry.status, league: entry.league, matchId: entry.matchId }
      : null,
    eligibility,
  });
}

export async function POST(request: Request) {
  const me = await getCurrentUserProfiles();
  if (!me) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const steamid64 = me.userProfile.steam_profile_id;
  if (!steamid64) {
    return NextResponse.json(
      { ok: false, error: "Link your Steam account to queue." },
      { status: 403 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = joinSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid league" },
      { status: 400 },
    );
  }

  try {
    const result = await joinQueue({
      steamid64,
      discordUserId: me.userProfile.discord_user_id ?? null,
      userProfileId: me.userProfile.id ?? null,
      league: parsed.data.league,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.reason }, { status: 409 });
    }
    return NextResponse.json(result);
  } catch (e) {
    // Unique partial index (one active entry per player) → treat as already queued.
    const message = e instanceof Error ? e.message : String(e);
    if (/queue_entries_one_active_per_player|duplicate key/i.test(message)) {
      return NextResponse.json(
        { ok: false, error: "You're already in the queue." },
        { status: 409 },
      );
    }
    console.error("[queue join]", message);
    return NextResponse.json(
      { ok: false, error: "Could not join queue" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const me = await getCurrentUserProfiles();
  if (!me) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const steamid64 = me.userProfile.steam_profile_id;
  if (!steamid64) {
    return NextResponse.json({ ok: true, left: false });
  }

  const result = await leaveQueue(steamid64);
  return NextResponse.json(result);
}
