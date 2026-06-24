import { NextResponse } from "next/server";

import { resetSim } from "@/entities/match-queue/lib/sim";
import { botEndMatch } from "@/lib/discord-bot-client";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";

/**
 * POST /api/sim/reset
 * Clears the caller's + all bots' queue entries, cancels any forming sim match, and
 * drops active cooldowns — a clean slate between simulation runs (dev only).
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const me = await getCurrentUserProfiles();
  const steamid64 = me?.userProfile.steam_profile_id ?? null;
  // `keepCooldowns` lets the dialog dismiss a resolved match without wiping a dodge
  // penalty — so the cooldown gate stays observable on the next FIND MATCH.
  const keepCooldowns = await request
    .json()
    .then((b: { keepCooldowns?: boolean }) => Boolean(b?.keepCooldowns))
    .catch(() => false);
  await resetSim(steamid64, { keepCooldowns });
  // Best-effort: tear down the current match's Discord voice channels too.
  await botEndMatch().catch(() => {});
  return NextResponse.json({ ok: true });
}
