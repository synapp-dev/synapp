import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import {
  GOOGLE_SCOPES,
  createOAuthClient,
  isGoogleConfigured,
} from "@/lib/google/client";

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (!isGoogleConfigured()) {
    return NextResponse.redirect(
      new URL("/calendar?google_error=not_configured", request.url)
    );
  }

  const redirectUri = `${request.nextUrl.origin}/api/google/callback`;
  const state = crypto.randomUUID();

  const authUrl = createOAuthClient(redirectUri).generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // always returns a refresh_token
    scope: GOOGLE_SCOPES,
    state,
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
