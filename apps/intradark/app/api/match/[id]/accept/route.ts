import { NextResponse } from "next/server";
import { z } from "zod";

import { setAcceptDecision } from "@/entities/match-queue/lib/accept";
import { recordUnverifiedAccept } from "@/lib/ac/events";
import { isAcGateEnabled, isAcLiveBySteamid64 } from "@/lib/ac/gate";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";

/**
 * POST /api/match/[id]/accept  { decision: "accept" | "decline" }
 * Records the signed-in player's §4 ready-check decision and re-drives resolution.
 */
const bodySchema = z.object({ decision: z.enum(["accept", "decline"]) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const me = await getCurrentUserProfiles();
  if (!me) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const steamid64 = me.userProfile.steam_profile_id;
  if (!steamid64) {
    return NextResponse.json(
      { ok: false, error: "Link your Steam account." },
      { status: 403 },
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
    return NextResponse.json({ ok: false, error: "Invalid decision" }, { status: 400 });
  }

  // AC gate (§Q2/Q8): you can't accept without a live anticheat client. Behind a
  // flag (default off — the league can launch without AC). Fail OPEN if our own
  // backend is unreachable: let play proceed but mark the accept "AC-unverified".
  if (parsed.data.decision === "accept" && isAcGateEnabled()) {
    let live: boolean;
    try {
      live = await isAcLiveBySteamid64(steamid64);
    } catch {
      live = true; // our outage, not the player's fault — don't block.
      await recordUnverifiedAccept(me.user.id, steamid64, id).catch(() => {});
    }
    if (!live) {
      return NextResponse.json(
        {
          ok: false,
          code: "ac_required",
          error: "Launch the Intradark Anticheat client to accept this match.",
        },
        { status: 409 },
      );
    }
  }

  const result = await setAcceptDecision(id, steamid64, parsed.data.decision);
  return NextResponse.json({ ok: true, ...result });
}
