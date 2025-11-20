import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const returnUrl = searchParams.get("returnUrl") || "/dashboard";
    const state = searchParams.get("state");

    // Get the base URL from the request
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host') || 'localhost:3000'}`;

    // Get the OpenID response parameters
    const openidMode = searchParams.get("openid.mode");
    const openidIdentity = searchParams.get("openid.identity");

    if (openidMode !== "id_res" || !openidIdentity) {
      return NextResponse.redirect(
        `${baseUrl}/auth?error=authentication_failed`
      );
    }

    // Extract Steam ID from the OpenID identity URL
    // Steam OpenID identity format: https://steamcommunity.com/openid/id/76561198012345678
    const steamIdMatch = openidIdentity.match(/\/openid\/id\/(\d+)$/);
    if (!steamIdMatch) {
      return NextResponse.redirect(
        `${baseUrl}/auth?error=invalid_steam_id`
      );
    }

    const steamId = steamIdMatch[1];
    if (!steamId) {
      return NextResponse.redirect(
        `${baseUrl}/auth?error=invalid_steam_id`
      );
    }

    // Verify the OpenID response with Steam
    const verificationResult = await verifyOpenIDResponse(request.url);
    if (!verificationResult) {
      return NextResponse.redirect(
        `${baseUrl}/auth?error=verification_failed`
      );
    }

    // No Supabase integration: just set a cookie with the SteamID and redirect

    // Prepare redirect response and store SteamID in a cookie for simple client use
    const response = NextResponse.redirect(`${baseUrl}${returnUrl}`);
    response.cookies.set("steamId", steamId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error("Steam callback error:", error);
    // Fallback URL if baseUrl wasn't set
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004';
    return NextResponse.redirect(
      `${baseUrl}/auth?error=callback_failed`
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
