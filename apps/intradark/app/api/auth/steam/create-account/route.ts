import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ensureMemberTemplateForProfileId } from "@/entities/rbac/lib/ensure-member-template";
import { ensurePlayer } from "@/entities/players/lib/server/registry";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Create user account with email and link Steam profile
 * POST /api/auth/steam/create-account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, steamId64, username: rawUsername } = body;

    if (!email || !steamId64) {
      return NextResponse.json(
        { error: "Email and Steam ID are required" },
        { status: 400 }
      );
    }

    const username =
      typeof rawUsername === "string" && rawUsername.trim()
        ? rawUsername.trim()
        : null;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Get Steam profile data from database
    const { data: steamProfile, error: steamProfileError } = await adminClient
      .from("steam_profiles")
      .select("*")
      .eq("steamid64", steamId64)
      .single();

    if (steamProfileError) {
      console.error("Error fetching Steam profile:", steamProfileError);
      return NextResponse.json(
        { error: "Steam profile not found. Please try signing in again." },
        { status: 404 }
      );
    }

    // Create user account
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        provider: "steam",
        steam_id_64: steamId64.toString(),
        personaname: steamProfile.personaname || null,
        avatarfull: steamProfile.avatarfull || null,
      },
    });

    if (createError || !userData) {
      const msg = createError?.message?.toLowerCase() ?? "";
      if (
        msg.includes("already been registered") ||
        msg.includes("already registered") ||
        msg.includes("user already registered") ||
        msg.includes("duplicate")
      ) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 },
        );
      }
      console.error("Error creating user:", createError);
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 },
      );
    }

    // Ensure user_profiles row exists (trigger may not run on all Supabase setups)
    // Upsert so we create or update in one step; copies auth user id, email, username into user_profiles
    const profilePayload = {
      user_id: userData.user.id,
      steam_profile_id: steamId64,
      email,
      username: username ?? null,
      display_name: steamProfile.personaname || null,
      avatar_url: steamProfile.avatarfull || null,
    };
    const { error: profileError } = await adminClient
      .from("user_profiles")
      .upsert(profilePayload, {
        onConflict: "user_id",
      });

    if (profileError) {
      console.error("Error upserting user profile:", profileError);
      // Continue anyway - the user account was created; trigger may have created the row
    }

    const { data: profileRow } = await adminClient
      .from("user_profiles")
      .select("id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (profileRow?.id) {
      await ensureMemberTemplateForProfileId(adminClient, profileRow.id);
    }

    // Claim any existing archived stats for this steamid64 by binding the
    // players registry row to the freshly created intradark account.
    await ensurePlayer(adminClient, String(steamId64));

    // Generate a session token for the user
    // We'll create a magic link that auto-signs them in
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const redirectTo = appUrl ? `${appUrl.replace(/\/$/, "")}/dashboard` : undefined;
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      ...(redirectTo && { options: { redirectTo } }),
    });

    // Clear the pending auth cookie
    const cookieStore = await cookies();
    cookieStore.set("steam_pending_auth", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    if (linkError || !linkData) {
      console.error("Error generating magic link:", linkError);
      // Return success anyway - user account was created
      return NextResponse.json({
        success: true,
        userId: userData.user.id,
        email: email,
        needsSignIn: true,
      });
    }

    // Return the magic link URL and hashed token - client can verifyOtp to auto sign-in
    return NextResponse.json({
      success: true,
      userId: userData.user.id,
      email: email,
      magicLink: linkData.properties?.action_link,
      hashedToken: linkData.properties?.hashed_token,
    });
  } catch (error) {
    console.error("Error in create-account:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
