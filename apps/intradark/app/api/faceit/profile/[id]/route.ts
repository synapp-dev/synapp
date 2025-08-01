import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: steamId64 } = await context.params;

    // Validate Steam ID64 (basic validation - must not be empty and be numeric)
    if (
      !steamId64 ||
      steamId64.trim().length === 0 ||
      !/^\d+$/.test(steamId64.trim())
    ) {
      return NextResponse.json(
        { error: "Invalid Steam ID64. Must be a valid numeric Steam ID64." },
        { status: 400 }
      );
    }

    const sanitizedSteamId64 = steamId64.trim();

    // Step 1: Search for player using Steam ID64
    const searchResponse = await fetch(
      `https://www.faceit.com/api/searcher/v1/players?limit=20&offset=0&game_id=${sanitizedSteamId64}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!searchResponse.ok) {
      if (searchResponse.status === 404) {
        return NextResponse.json(
          { error: "Faceit profile not found for this Steam ID64" },
          { status: 404 }
        );
      }
      throw new Error(`Faceit search API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();

    // Check if we found any players
    if (!searchData.payload || searchData.payload.length === 0) {
      return NextResponse.json(
        { error: "No Faceit profile found for this Steam ID64" },
        { status: 404 }
      );
    }

    // Get the first (and should be only) player from the search results
    const player = searchData.payload[0];
    const faceitId = player.id;

    // Step 2: Get detailed profile using the Faceit ID
    const profileResponse = await fetch(
      `https://www.faceit.com/api/users/v1/users/${faceitId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!profileResponse.ok) {
      if (profileResponse.status === 404) {
        return NextResponse.json(
          { error: "Faceit profile details not found" },
          { status: 404 }
        );
      }
      throw new Error(`Faceit profile API error: ${profileResponse.status}`);
    }

    const profileData = await profileResponse.json();

    // Combine search data with profile data for a complete response
    const combinedData = {
      ...profileData,
      searchInfo: {
        nickname: player.nickname,
        country: player.country,
        avatar: player.avatar,
        verification_level: player.verification_level,
        games: player.games,
      },
    };

    return NextResponse.json(combinedData);
  } catch (error) {
    console.error("Error fetching Faceit profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
