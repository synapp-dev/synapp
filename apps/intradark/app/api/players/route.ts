import { NextResponse } from "next/server";

/**
 * GET /api/players
 * Player directory listing. Extend with DB or search once the index exists.
 */
export async function GET() {
  return NextResponse.json({ players: [] });
}
