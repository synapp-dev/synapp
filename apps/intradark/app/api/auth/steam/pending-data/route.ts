import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Get pending Steam auth data from cookie
 * GET /api/auth/steam/pending-data
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const steamCookie = cookieStore.get("steam_pending_auth");

    if (!steamCookie?.value) {
      return NextResponse.json(
        { error: "No pending Steam authentication data" },
        { status: 404 }
      );
    }

    try {
      const steamData = JSON.parse(steamCookie.value);
      return NextResponse.json({ steamData });
    } catch (error) {
      console.error("Error parsing Steam cookie:", error);
      return NextResponse.json(
        { error: "Invalid Steam authentication data" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in pending-data route:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
