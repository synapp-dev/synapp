import { NextResponse } from "next/server";

import { getMatchView } from "@/entities/match-queue/lib/accept";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";

/**
 * GET /api/match/[id]
 * Accept-phase snapshot for the ready-check dialog: roster + per-player accept status
 * + the viewer's own row. Reading lazily resolves an expired accept window (§4).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const me = await getCurrentUserProfiles();
  const steamid64 = me?.userProfile.steam_profile_id ?? null;

  const view = await getMatchView(id, steamid64);
  if (!view) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  return NextResponse.json(view);
}
