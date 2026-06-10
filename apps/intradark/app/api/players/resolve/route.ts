import { NextResponse } from "next/server";

import { resolvePlayerIdentifier } from "@/entities/players/lib/server/resolve-server";

/**
 * GET /api/players/resolve?input=<identifier>
 * Resolves @username / steamid64 / steam URL or vanity / faceit nickname to a
 * steamid64 and its canonical profile path.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input")?.trim();

  if (!input) {
    return NextResponse.json(
      { success: false, error: "Missing input" },
      { status: 400 },
    );
  }

  const resolved = await resolvePlayerIdentifier(input);
  if (!resolved) {
    return NextResponse.json(
      { success: false, error: "Player not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, ...resolved });
}
