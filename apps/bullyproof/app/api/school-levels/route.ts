/**
 * School Levels API route handler.
 *
 * Exposes HTTP endpoints for school level management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read school levels.
 *
 * Endpoints:
 * - GET /api/school-levels - List all school levels
 *
 * Responses:
 * - 200 OK: Returns school level data or array of levels.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { schoolLevelsService } from "@/server/school-levels/school-levels.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/school-levels
 *
 * Returns a list of school levels.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the list of levels or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const levels = await schoolLevelsService.getSchoolLevels({ userId }, query);
    return NextResponse.json(levels, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
