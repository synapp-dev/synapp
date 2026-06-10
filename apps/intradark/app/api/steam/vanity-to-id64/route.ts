import { NextResponse } from "next/server";

import { resolveSteamVanity } from "@/entities/players/lib/server/sources";

/**
 * GET /api/steam/vanity-to-id64?vanityUrl=<vanity>
 * Resolves a Steam vanity (custom URL) to a steamid64.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vanityUrl = searchParams.get("vanityUrl")?.trim();

  if (!vanityUrl) {
    return NextResponse.json(
      { success: false, error: "Missing vanityUrl" },
      { status: 400 },
    );
  }

  const steamid64 = await resolveSteamVanity(vanityUrl);
  if (!steamid64) {
    return NextResponse.json(
      { success: false, error: "Could not resolve Steam vanity URL" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: steamid64 });
}
