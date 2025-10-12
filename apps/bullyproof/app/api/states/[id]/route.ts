/**
 * State by ID API route handler.
 *
 * Exposes HTTP endpoints for specific state management.
 *
 * Authentication:
 * - No authentication required (public data).
 *
 * Endpoints:
 * - GET /api/states/[id] - Get state by ID
 *
 * Responses:
 * - 200 OK: Returns state data.
 * - 404 Not Found: `{ error: string }` when state is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { statesService } from "@/server/states/states.service";

/**
 * Handle GET /api/states/[id]
 *
 * Returns a specific state's information by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the state ID.
 * @returns A JSON `NextResponse` with the state data or an error payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stateData = await statesService.getStateById({ userId: null }, { id });

    if (!stateData) {
      return NextResponse.json({ error: "State not found" }, { status: 404 });
    }

    return NextResponse.json(stateData, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
