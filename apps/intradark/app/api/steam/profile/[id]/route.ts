import { NextResponse } from "next/server";

import { isSteamId64 } from "@/entities/players/lib/resolve";
import { archiveSteam } from "@/entities/players/lib/server/archive";

/**
 * GET /api/steam/profile/[id]
 * DB-first Steam profile: returns the archived profile within TTL, otherwise
 * fetches from the Steam Web API, upserts steam_profiles, and returns fresh.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isSteamId64(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid steamid64" },
      { status: 400 },
    );
  }

  const { data } = await archiveSteam(id);
  if (!data) {
    return NextResponse.json(
      { success: false, error: "Steam profile not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(data);
}
