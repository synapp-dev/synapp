import { NextRequest, NextResponse } from "next/server";

interface SteamVanityResponse {
  response: {
    steamid?: string;
    success: number;
    message?: string;
  };
}

interface PlayerSummaryResponse {
  response: {
    players: Array<{
      steamid: string;
      personaname: string;
      profileurl: string;
      avatar: string;
      avatarmedium: string;
      avatarfull: string;
      personastate: number;
      realname?: string;
      primaryclanid?: string;
      timecreated?: number;
      loccountrycode?: string;
      locstatecode?: string;
      loccityid?: number;
      // The vanity URL is not directly provided, but can be parsed from profileurl
    }>;
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const steamApiKey = process.env.STEAM_API_KEY;

    if (!steamApiKey) {
      return NextResponse.json(
        { error: "Steam API key is not configured" },
        { status: 500 }
      );
    }

    let steamid64 = id;
    let inputWasVanity = false;

    // If not a 17-digit number, treat as vanity and resolve
    if (!/^\d{17}$/.test(id)) {
      inputWasVanity = true;
      // It's a vanity URL, resolve it to Steam ID64
      const resolveUrl = `http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${steamApiKey}&vanityurl=${encodeURIComponent(id)}`;
      const response = await fetch(resolveUrl);
      if (!response.ok) {
        throw new Error(`Steam API request failed: ${response.status}`);
      }
      const data: SteamVanityResponse = await response.json();
      if (data.response.success === 1 && data.response.steamid) {
        steamid64 = data.response.steamid;
      } else {
        // Vanity URL not found, redirect to /players/{id} (will show error)
        return NextResponse.redirect(new URL(`/players/${id}`, request.url));
      }
    }

    // Now fetch player summary to try to get the vanity URL
    const summaryUrl = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${steamid64}`;
    const summaryResponse = await fetch(summaryUrl);
    if (!summaryResponse.ok) {
      throw new Error(`Steam API request failed: ${summaryResponse.status}`);
    }
    const summaryData: PlayerSummaryResponse = await summaryResponse.json();
    const player = summaryData.response.players[0];

    // Try to extract the vanity from the profileurl
    let vanity: string | null = null;
    if (player && player.profileurl) {
      // Typical profileurl: https://steamcommunity.com/id/vanity/ or https://steamcommunity.com/profiles/steamid64
      const match = player.profileurl.match(
        /steamcommunity\.com\/id\/([^\/]+)\/?/
      );
      if (match) {
        vanity = match[1] ?? null;
      }
    }

    if (vanity) {
      // Redirect to /players/{vanity}
      return NextResponse.redirect(new URL(`/players/${vanity}`, request.url));
    } else {
      // Fallback to /players/{steamid64}
      return NextResponse.redirect(
        new URL(`/players/${steamid64}`, request.url)
      );
    }
  } catch (error) {
    console.error("Steam resolve error:", error);
    // On error, redirect to players page with original input (will show error)
    return NextResponse.redirect(
      new URL(`/players/${(await context.params).id}`, request.url)
    );
  }
}
