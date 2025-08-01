import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();

    const provider = body.provider;
    const map = body.map;
    const round = body.round;
    const player = body.player;
    const playerMatchStats = body.player_match_stats;

    console.log(body);

    // Return a success response
    return NextResponse.json({
      success: true,
      message: "Data received and logged",
      receivedData: body,
    });
  } catch (error) {
    console.error("Error processing POST request to /api/ingame:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error processing request",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
