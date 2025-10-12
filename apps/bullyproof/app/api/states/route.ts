/**
 * States API route handler.
 *
 * Exposes HTTP endpoints for Australian states/territories.
 *
 * Authentication:
 * - No authentication required (public data).
 *
 * Endpoints:
 * - GET /api/states - List all states
 *
 * Responses:
 * - 200 OK: Returns state data or array of states.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { statesService } from "@/server/states/states.service";

/**
 * Handle GET /api/states
 *
 * Returns a list of Australian states and territories.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the list of states or an error payload.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const states = await statesService.getStates({ userId: null }, query);
    return NextResponse.json(states, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
