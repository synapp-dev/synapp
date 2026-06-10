import { NextResponse } from "next/server";

import { isSteamId64 } from "@/entities/players/lib/resolve";
import { archiveFaceit } from "@/entities/players/lib/server/archive";

/**
 * GET /api/faceit/profile/[id]
 * DB-first Faceit profile: returns the latest archived snapshot within TTL,
 * otherwise fetches the Faceit Data API and appends a new snapshot.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isSteamId64(id)) {
    return NextResponse.json(
      { result: "error", error: "Invalid steamid64" },
      { status: 400 },
    );
  }

  const { data } = await archiveFaceit(id);
  if (!data) {
    return NextResponse.json(
      { result: "error", error: "Faceit profile not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(data);
}
