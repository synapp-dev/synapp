import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ensureMemberTemplateForProfileId } from "@/entities/rbac/lib/ensure-member-template";
import { DISCORD_OAUTH_STATE_COOKIE } from "@/lib/discord-oauth-constants";
import { createAdminClient } from "@/utils/supabase/admin";
import { createServerClient } from "@/utils/supabase/server";

/**
 * Discord OAuth2 callback — exchanges code, stores discord_user_id on user_profiles.
 * GET /api/auth/discord/callback
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      new URL(
        `/dashboard?error=discord_oauth_${encodeURIComponent(oauthError)}`,
        baseUrl
      )
    );
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(DISCORD_OAUTH_STATE_COOKIE)?.value;
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(
      new URL("/dashboard?error=discord_state_invalid", baseUrl)
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

  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard?error=discord_missing_code", baseUrl)
    );
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/dashboard?error=discord_not_configured", baseUrl)
    );
  }

  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/auth/discord/callback`;

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("Discord token exchange failed:", text);
    const res = NextResponse.redirect(
      new URL("/dashboard?error=discord_token_failed", baseUrl)
    );
    res.cookies.delete(DISCORD_OAUTH_STATE_COOKIE);
    return res;
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    const res = NextResponse.redirect(
      new URL("/dashboard?error=discord_token_failed", baseUrl)
    );
    res.cookies.delete(DISCORD_OAUTH_STATE_COOKIE);
    return res;
  }

  const meRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!meRes.ok) {
    const res = NextResponse.redirect(
      new URL("/dashboard?error=discord_user_failed", baseUrl)
    );
    res.cookies.delete(DISCORD_OAUTH_STATE_COOKIE);
    return res;
  }

  const me = (await meRes.json()) as { id: string };
  const discordUserId = me.id;

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("user_profiles")
    .select("user_id")
    .eq("discord_user_id", discordUserId)
    .maybeSingle();

  if (existing && existing.user_id !== user.id) {
    const res = NextResponse.redirect(
      new URL("/dashboard?error=discord_already_linked", baseUrl)
    );
    res.cookies.delete(DISCORD_OAUTH_STATE_COOKIE);
    return res;
  }

  const { error: updateError } = await admin
    .from("user_profiles")
    .update({ discord_user_id: discordUserId })
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Discord link update error:", updateError);
    const res = NextResponse.redirect(
      new URL("/dashboard?error=discord_save_failed", baseUrl)
    );
    res.cookies.delete(DISCORD_OAUTH_STATE_COOKIE);
    return res;
  }

  const { data: discordProfile } = await admin
    .from("user_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (discordProfile?.id) {
    await ensureMemberTemplateForProfileId(admin, discordProfile.id);
  }

  const res = NextResponse.redirect(
    new URL("/dashboard?discord_linked=true", baseUrl)
  );
  res.cookies.delete(DISCORD_OAUTH_STATE_COOKIE);
  return res;
}
