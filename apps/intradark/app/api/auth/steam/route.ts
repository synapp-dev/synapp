import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const returnUrl = searchParams.get("returnUrl") || "/home";

    // Steam OpenID 2.0 authentication URL
    const steamAuthUrl = "https://steamcommunity.com/openid/login";

    // Generate a unique state parameter for security
    const state = Math.random().toString(36).substring(2, 15);

    // Build the OpenID request parameters
    const params = new URLSearchParams({
      "openid.ns": "http://specs.openid.net/auth/2.0",
      "openid.mode": "checkid_setup",
      "openid.return_to": `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/steam/callback?returnUrl=${encodeURIComponent(returnUrl)}&state=${state}`,
      "openid.realm":
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
      "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    });

    // Redirect to Steam for authentication
    return NextResponse.redirect(`${steamAuthUrl}?${params.toString()}`);
  } catch (error) {
    console.error("Steam auth error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Steam authentication" },
      { status: 500 }
    );
  }
}
