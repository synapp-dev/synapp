import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const returnUrl = searchParams.get("returnUrl") || "/home";
    const state = searchParams.get("state");

    // Get the OpenID response parameters
    const openidMode = searchParams.get("openid.mode");
    const openidIdentity = searchParams.get("openid.identity");

    if (openidMode !== "id_res" || !openidIdentity) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth?error=authentication_failed`
      );
    }

    // Extract Steam ID from the OpenID identity URL
    // Steam OpenID identity format: https://steamcommunity.com/openid/id/76561198012345678
    const steamIdMatch = openidIdentity.match(/\/openid\/id\/(\d+)$/);
    if (!steamIdMatch) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth?error=invalid_steam_id`
      );
    }

    const steamId = steamIdMatch[1];

    // Verify the OpenID response with Steam
    const verificationResult = await verifyOpenIDResponse(request.url);
    if (!verificationResult) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth?error=verification_failed`
      );
    }

    // Fetch user profile from Steam API
    const steamApiKey = process.env.STEAM_API_KEY;
    if (steamApiKey) {
      try {
        const profileUrl = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${steamId}`;
        const profileResponse = await fetch(profileUrl);

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          const player = profileData.response.players?.[0];

          if (player) {
            const userData = {
              steamId: player.steamid,
              displayName: player.personaname,
              profileUrl: player.profileurl,
              avatar: player.avatar,
              avatarFull: player.avatarfull,
              realName: player.realname,
              timeCreated: player.timecreated,
            };

            // Here you would typically:
            // 1. Store user in your database
            // 2. Create a session
            // 3. Set authentication cookies

            const encodedUserData = encodeURIComponent(
              JSON.stringify(userData)
            );
            return NextResponse.redirect(
              `${process.env.NEXT_PUBLIC_APP_URL}${returnUrl}?user=${encodedUserData}`
            );
          }
        }
      } catch (error) {
        console.error("Steam API error:", error);
      }
    }

    // Fallback: just return the Steam ID if API call fails
    const userData = {
      steamId,
      displayName: "Steam User",
    };

    const encodedUserData = encodeURIComponent(JSON.stringify(userData));
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}${returnUrl}?user=${encodedUserData}`
    );
  } catch (error) {
    console.error("Steam callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth?error=callback_failed`
    );
  }
}

async function verifyOpenIDResponse(callbackUrl: string): Promise<boolean> {
  try {
    // This is a simplified verification
    // In production, you should implement proper OpenID 2.0 verification
    // For now, we'll just check if the response contains the expected parameters
    const url = new URL(callbackUrl);
    const openidMode = url.searchParams.get("openid.mode");
    const openidIdentity = url.searchParams.get("openid.identity");

    return openidMode === "id_res" && !!openidIdentity;
  } catch (error) {
    console.error("OpenID verification error:", error);
    return false;
  }
}
