import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { buildXeroAuthUrl, isXeroConfigured } from "@/lib/xero/client";

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (!isXeroConfigured()) {
    return NextResponse.redirect(
      new URL("/finance/accounts?xero_error=not_configured", request.url)
    );
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildXeroAuthUrl(state));
  response.cookies.set("xero_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
