import { NextResponse } from "next/server";

import { isSteamId64 } from "@/entities/players/lib/resolve";
import { archiveLeetify } from "@/entities/players/lib/server/archive";

/**
 * GET /api/leetify/profile/[id]
 * DB-first Leetify profile: returns the latest archived snapshot within TTL,
 * otherwise fetches the public Leetify API and appends a new snapshot.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isSteamId64(id)) {
    return NextResponse.json({ error: "Invalid steamid64" }, { status: 400 });
  }

  const { data } = await archiveLeetify(id);
  if (!data) {
    return NextResponse.json(
      { error: "Leetify profile not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(data);
}
