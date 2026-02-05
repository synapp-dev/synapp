import { NextRequest, NextResponse } from "next/server";
import openid from "openid";

const STEAM_OPENID_URL = "https://steamcommunity.com/openid/";

/**
 * Initiate Steam OpenID authentication flow
 * GET /api/auth/steam
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = 'http://localhost:3004';
    const returnUrl = `${baseUrl}/api/auth/steam/callback`;

    // Create OpenID relying party
    const relyingParty = new openid.RelyingParty(
      returnUrl,
      baseUrl,
      true, // stateless
      false, // strict mode
      []
    );

    // Wrap the callback-based authenticate in a Promise
    return new Promise<NextResponse>((resolve) => {
      relyingParty.authenticate(
        STEAM_OPENID_URL,
        false,
        (error, authUrl) => {
          if (error) {
            console.error("OpenID authentication error:", error);
            resolve(
              NextResponse.redirect(
                new URL("/dashboard?error=steam_auth_failed", baseUrl)
              )
            );
            return;
          }

          if (!authUrl) {
            resolve(
              NextResponse.redirect(
                new URL("/dashboard?error=steam_auth_failed", baseUrl)
              )
            );
            return;
          }

          // Redirect to Steam
          resolve(NextResponse.redirect(authUrl));
        }
      );
    });
  } catch (error) {
    console.error("Error initiating Steam auth:", error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return NextResponse.redirect(
      new URL("/dashboard?error=steam_auth_failed", baseUrl)
    );
  }
}
