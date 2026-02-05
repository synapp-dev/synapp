import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@/utils/supabase/server";

/**
 * Sign out: clear Supabase session and all Steam-related cookies, then redirect to dashboard.
 * Use a full page navigation to this URL (e.g. <a href="/api/auth/signout">) so the server
 * can clear httpOnly cookies and the session.
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const redirectTo = new URL("/dashboard", baseUrl);

  try {
    const supabase = await createServerClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Error signing out from Supabase:", error);
  }

  const cookieStore = await cookies();

  // Clear Steam-related cookies so next sign-in is a clean state
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  };
  cookieStore.set("steam_pending_auth", "", clearOptions);
  cookieStore.set("steam_existing_user_id", "", clearOptions);

  return NextResponse.redirect(redirectTo);
}
