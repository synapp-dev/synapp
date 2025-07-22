import { NextRequest, NextResponse } from "next/server";

async function resolveVanityUrl(vanityUrl: string): Promise<string | null> {
  const steamApiKey = process.env.STEAM_API_KEY;

  if (!steamApiKey) {
    throw new Error("Steam API key not configured");
  }

  try {
    const response = await fetch(
      `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${steamApiKey}&vanityurl=${vanityUrl}`
    );

    if (!response.ok) {
      throw new Error(`Steam API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.response.success === 1) {
      return data.response.steamid;
    }

    return null; // Vanity URL not found
  } catch (error) {
    console.error("Error resolving vanity URL:", error);
    throw error;
  }
}

async function getSteamProfile(steamId: string): Promise<any> {
  const steamApiKey = process.env.STEAM_API_KEY;

  if (!steamApiKey) {
    throw new Error("Steam API key not configured");
  }

  try {
    const response = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${steamId}`
    );

    if (!response.ok) {
      throw new Error(`Steam API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.response.players && data.response.players.length > 0) {
      return data.response.players[0];
    }

    return null;
  } catch (error) {
    console.error("Error fetching Steam profile:", error);
    throw error;
  }
}

function extractVanityUrlFromProfileUrl(profileUrl: string): string | null {
  // Extract vanity URL from profile URL like "https://steamcommunity.com/id/j0urdain/"
  const match = profileUrl.match(/\/id\/([^\/]+)/);
  return match ? match[1] || null : null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: input } = await context.params;
    let steamId: string;
    let isSteamId64 = false;

    // Check if input is a valid Steam ID64 (17 digits)
    if (/^\d{17}$/.test(input)) {
      steamId = input;
      isSteamId64 = true;
    } else {
      // If not a Steam ID64, treat as vanity URL and resolve it
      const resolvedSteamId = await resolveVanityUrl(input);

      if (!resolvedSteamId) {
        return NextResponse.json(
          { error: "Vanity URL not found or invalid" },
          { status: 404 }
        );
      }

      steamId = resolvedSteamId;
    }

    // Get Steam profile to extract vanity URL (we'll need this for the response)
    const steamProfile = await getSteamProfile(steamId);
    let vanityUrl: string | null = null;

    if (steamProfile && steamProfile.profileurl) {
      vanityUrl = extractVanityUrlFromProfileUrl(steamProfile.profileurl);
    }

    // If the input was a Steam ID64 and we have a vanity URL, redirect to the vanity URL version
    if (isSteamId64 && vanityUrl) {
      return NextResponse.redirect(
        new URL(`/api/leetify/${vanityUrl}`, request.url)
      );
    }

    // Fetch data from Leetify API
    const leetifyResponse = await fetch(
      `https://api.cs-prod.leetify.com/api/profile/id/${steamId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!leetifyResponse.ok) {
      if (leetifyResponse.status === 404) {
        return NextResponse.json(
          { error: "Profile not found" },
          { status: 404 }
        );
      }
      throw new Error(`Leetify API error: ${leetifyResponse.status}`);
    }

    const profileData = await leetifyResponse.json();

    // Add vanity URL to the response if we have it
    if (vanityUrl) {
      profileData.meta = {
        ...profileData.meta,
        vanityUrl: vanityUrl,
      };
    }

    return NextResponse.json(profileData);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
