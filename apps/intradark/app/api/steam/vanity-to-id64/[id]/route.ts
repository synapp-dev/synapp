import { NextRequest, NextResponse } from "next/server";

interface SteamVanityResponse {
  response: {
    steamid?: string;
    success: number;
    message?: string;
  };
}

interface VanityToId64Response {
  success: boolean;
  data?: string;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vanityUrl = searchParams.get("vanityUrl");
    const steamApiKey = process.env.STEAM_API_KEY;

    if (!vanityUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Vanity URL is required",
        } as VanityToId64Response,
        { status: 400 }
      );
    }

    if (!steamApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Steam API key is not configured",
        } as VanityToId64Response,
        { status: 500 }
      );
    }

    // Call Steam API to resolve vanity URL
    const resolveUrl = `http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${steamApiKey}&vanityurl=${encodeURIComponent(vanityUrl)}`;
    const response = await fetch(resolveUrl);

    if (!response.ok) {
      throw new Error(`Steam API request failed: ${response.status}`);
    }

    const data: SteamVanityResponse = await response.json();

    if (data.response.success === 1 && data.response.steamid) {
      return NextResponse.json({
        success: true,
        data: data.response.steamid,
      } as VanityToId64Response);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: data.response.message || "Vanity URL not found",
        } as VanityToId64Response,
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Steam vanity URL resolution error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to resolve Steam vanity URL",
      } as VanityToId64Response,
      { status: 500 }
    );
  }
}
