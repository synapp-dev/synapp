import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  getOrCreateSteamProfile,
  linkSteamProfileToUser,
} from "@/utils/steam-profile";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { steamid64 } = await request.json();

    if (!steamid64) {
      return NextResponse.json(
        { error: "Steam ID is required" },
        { status: 400 }
      );
    }

    // Get or create the Steam profile
    const steamProfile = await getOrCreateSteamProfile(steamid64);

    if (!steamProfile) {
      return NextResponse.json(
        { error: "Failed to fetch Steam profile" },
        { status: 400 }
      );
    }

    // Link the Steam profile to the user
    const linked = await linkSteamProfileToUser(steamid64);

    if (!linked) {
      return NextResponse.json(
        { error: "Failed to link Steam profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      steamProfile,
      message: "Steam profile linked successfully",
    });
  } catch (error) {
    console.error("Error linking Steam profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Unlink the Steam profile from the user
    const { data, error } = await supabase.rpc(
      "unlink_steam_profile_from_user"
    );

    if (error) {
      return NextResponse.json(
        { error: "Failed to unlink Steam profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Steam profile unlinked successfully",
    });
  } catch (error) {
    console.error("Error unlinking Steam profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
