import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { DISCORD_OAUTH_STATE_COOKIE } from "@/lib/discord-oauth-constants";
import { createServerClient } from "@/utils/supabase/server";

/**
 * Start Discord OAuth2 (identify) — user must be signed in.
 * GET /api/auth/discord
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/dashboard?error=discord_not_configured", baseUrl)
    );
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL("/dashboard?error=discord_signin_required", baseUrl)
    );
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/auth/discord/callback`;

  const authorize = new URL("https://discord.com/api/oauth2/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "identify");
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize.toString());
  response.cookies.set(DISCORD_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
