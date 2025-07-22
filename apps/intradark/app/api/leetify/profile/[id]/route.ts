import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: steamId } = await context.params;

    // Validate Steam ID format (should be 17 digits for Steam ID64)
    if (!/^\d{17}$/.test(steamId)) {
      return NextResponse.json(
        {
          error:
            "Invalid Steam ID format. Please provide a valid Steam ID64 (17 digits)",
        },
        { status: 400 }
      );
    }

    // Fetch data from Leetify API
    const leetifyResponse = await fetch(
      `https://api.cs-prod.leetify.com/api/profile/id/${steamId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!leetifyResponse.ok) {
      if (leetifyResponse.status === 404) {
        return NextResponse.json(
          { error: "Profile not found" },
          { status: 404 }
        );
      }
      throw new Error(`Leetify API error: ${leetifyResponse.status}`);
    }

    const profileData = await leetifyResponse.json();

    return NextResponse.json(profileData);
  } catch (error) {
    console.error("Error fetching Leetify profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
