import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import openid from "openid";
import { extractSteamId } from "@/utils/steam/openid";
import { fetchSteamProfile, steamProfileToDbFormat } from "@/utils/steam/profile";
import { createAdminClient } from "@/utils/supabase/admin";
import { createServerClient } from "@/utils/supabase/server";

/**
 * Handle Steam OpenID callback
 * GET /api/auth/steam/callback
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const returnUrl = `${baseUrl}/api/auth/steam/callback`;
    const url = new URL(request.url);

    // Create OpenID relying party
    const relyingParty = new openid.RelyingParty(
      returnUrl,
      baseUrl,
      true, // stateless
      false, // strict mode
      []
    );

    // Verify the OpenID response
    return new Promise<NextResponse>((resolve) => {
      relyingParty.verifyAssertion(url.toString(), (error, result) => {
        if (error) {
          console.error("OpenID verification error:", error);
          resolve(
            NextResponse.redirect(
              new URL("/dashboard?error=steam_verification_failed", baseUrl)
            )
          );
          return;
        }

        if (!result || !result.authenticated) {
          resolve(
            NextResponse.redirect(
              new URL("/dashboard?error=steam_verification_failed", baseUrl)
            )
          );
          return;
        }

        // Extract SteamID from claimed ID
        const claimedId = result.claimedIdentifier || "";
        const steamId = extractSteamId(claimedId);

        if (!steamId) {
          console.error("Failed to extract SteamID from:", claimedId);
          resolve(
            NextResponse.redirect(
              new URL("/dashboard?error=steam_id_extraction_failed", baseUrl)
            )
          );
          return;
        }

        // Process the Steam authentication
        processSteamAuth(steamId, baseUrl).then((response) => {
          resolve(response);
        });
      });
    });
  } catch (error) {
    console.error("Error in Steam callback:", error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return NextResponse.redirect(
      new URL("/dashboard?error=steam_callback_error", baseUrl)
    );
  }
}

/**
 * Process Steam authentication: fetch profile, check for existing user, redirect accordingly
 */
async function processSteamAuth(
  steamId: string,
  baseUrl: string
): Promise<NextResponse> {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc743fdb-5dfa-4224-97c2-690d55b78495',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/steam/callback/route.ts:82',message:'processSteamAuth entry',data:{steamId,steamIdType:typeof steamId,steamIdLength:steamId.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Get Steam API key from environment
    const steamApiKey = process.env.STEAM_API_KEY;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc743fdb-5dfa-4224-97c2-690d55b78495',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/steam/callback/route.ts:87',message:'Steam API key check',data:{hasApiKey:!!steamApiKey,apiKeyLength:steamApiKey?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Fetch Steam profile data
    const steamProfile = await fetchSteamProfile(steamId, steamApiKey);
    
    if (!steamProfile) {
      console.error("Failed to fetch Steam profile for:", steamId);
      return NextResponse.redirect(
        new URL("/dashboard?error=steam_profile_fetch_failed", baseUrl)
      );
    }

    const adminClient = createAdminClient();
    const steamId64 = BigInt(steamId);
    const steamId64Number = Number(steamId64);

    // Convert to database format
    const profileData = steamProfileToDbFormat(steamProfile);

    // Upsert Steam profile
    const { error: profileError } = await adminClient
      .from("steam_profiles")
      .upsert(profileData, {
        onConflict: "steamid64",
      });

    if (profileError) {
      console.error("Error upserting Steam profile:", profileError);
      return NextResponse.redirect(
        new URL("/dashboard?error=steam_profile_save_failed", baseUrl)
      );
    }

    // Check if user_profile exists with this steam_profile_id
    const { data: existingProfile, error: profileCheckError } = await adminClient
      .from("user_profiles")
      .select("user_id, email")
      .eq("steam_profile_id", steamId64Number)
      .single();

    if (profileCheckError && profileCheckError.code !== "PGRST116") {
      // PGRST116 is "not found" which is expected if no profile exists
      console.error("Error checking user profile:", profileCheckError);
    }

    if (existingProfile) {
      // Existing user: sign them in by redirecting to a magic link
      let email: string | null = existingProfile.email ?? null;
      if (!email) {
        const { data: authUser } = await adminClient.auth.admin.getUserById(
          existingProfile.user_id
        );
        email = authUser?.user?.email ?? null;
      }
      if (email) {
        const appUrl = baseUrl.replace(/\/$/, "");
        const redirectTo = `${appUrl}/dashboard`;
        const { data: linkData, error: linkError } =
          await adminClient.auth.admin.generateLink({
            type: "magiclink",
            email,
            options: { redirectTo },
          });
        if (!linkError && linkData?.properties) {
          const hashedToken = linkData.properties.hashed_token;
          if (hashedToken) {
            const completeUrl = new URL(
              "/api/auth/steam/complete-signin",
              baseUrl
            );
            completeUrl.searchParams.set("token_hash", hashedToken);
            return NextResponse.redirect(completeUrl.toString());
          }
          if (linkData.properties.action_link) {
            return NextResponse.redirect(linkData.properties.action_link);
          }
        }
        console.error("Error generating magic link for existing user:", linkError);
      } else {
        console.warn(
          "Existing user has no email: user_id=",
          existingProfile.user_id,
          "steam_profile_id=",
          steamId64Number
        );
      }
      // Fallback: redirect to dashboard (user can try again)
      return NextResponse.redirect(
        new URL("/dashboard?error=steam_signin_failed", baseUrl)
      );
    }

    // No user profile with this Steam ID - check if current session has an email
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let email: string | null = user?.email ?? null;
    if (user && !email) {
      const { data: profileRow } = await adminClient
        .from("user_profiles")
        .select("email")
        .eq("user_id", user.id)
        .single();
      email = profileRow?.email ?? null;
    }

    if (user && email && emailRegex.test(email)) {
      // Link Steam profile to existing user (update if profile exists, else insert)
      const { data: existingUserProfile } = await adminClient
        .from("user_profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      if (existingUserProfile) {
        const { error: linkError } = await adminClient
          .from("user_profiles")
          .update({
            steam_profile_id: steamId64Number,
            display_name: steamProfile.personaname || null,
            avatar_url: steamProfile.avatarfull || null,
          })
          .eq("user_id", user.id);
        if (linkError) {
          console.error("Error linking Steam profile to existing user:", linkError);
          return NextResponse.redirect(
            new URL("/dashboard?error=steam_link_failed", baseUrl)
          );
        }
      } else {
        const { error: insertError } = await adminClient
          .from("user_profiles")
          .insert({
            user_id: user.id,
            steam_profile_id: steamId64Number,
            email,
            display_name: steamProfile.personaname || null,
            avatar_url: steamProfile.avatarfull || null,
          });
        if (insertError) {
          console.error("Error linking Steam profile to existing user:", insertError);
          return NextResponse.redirect(
            new URL("/dashboard?error=steam_link_failed", baseUrl)
          );
        }
      }

      return NextResponse.redirect(new URL("/dashboard?steam_linked=true", baseUrl));
    }

    // No logged-in user with email - redirect to email collection
    return storeSteamDataAndRedirect(steamId64Number, steamProfile, baseUrl);
  } catch (error) {
    console.error("Error processing Steam auth:", error);
    return NextResponse.redirect(
      new URL("/dashboard?error=steam_auth_processing_failed", baseUrl)
    );
  }
}

/**
 * Store Steam data in cookies and redirect to email collection page
 */
async function storeSteamDataAndRedirect(
  steamId64: number,
  steamProfile: Awaited<ReturnType<typeof fetchSteamProfile>>,
  baseUrl: string
): Promise<NextResponse> {
  if (!steamProfile) {
    return NextResponse.redirect(
      new URL("/dashboard?error=steam_profile_missing", baseUrl)
    );
  }

  const cookieStore = await cookies();
  
  // Store Steam data in secure, httpOnly cookies
  // We'll store the steamId64 and basic profile info
  const steamData = {
    steamId64,
    personaname: steamProfile.personaname,
    avatarfull: steamProfile.avatarfull,
    profileurl: steamProfile.profileurl,
  };

  cookieStore.set("steam_pending_auth", JSON.stringify(steamData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  return NextResponse.redirect(new URL("/steam-username-email", baseUrl));
}
