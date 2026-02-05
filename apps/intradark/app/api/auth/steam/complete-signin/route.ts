import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

/**
 * Complete Steam sign-in for existing users: exchange token_hash for a session
 * on the app domain, then redirect to dashboard.
 * GET /api/auth/steam/complete-signin?token_hash=...
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const tokenHash = request.nextUrl.searchParams.get("token_hash");

  if (!tokenHash) {
    return NextResponse.redirect(
      new URL("/dashboard?error=steam_signin_failed", baseUrl)
    );
  }

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });

    if (error) {
      console.error("Error verifying OTP for Steam sign-in:", error);
      return NextResponse.redirect(
        new URL("/dashboard?error=steam_signin_failed", baseUrl)
      );
    }

    return NextResponse.redirect(new URL("/dashboard", baseUrl));
  } catch (err) {
    console.error("Error in complete-signin:", err);
    return NextResponse.redirect(
      new URL("/dashboard?error=steam_signin_failed", baseUrl)
    );
  }
}
