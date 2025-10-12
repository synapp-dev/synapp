/**
 * School Level by ID API route handler.
 *
 * Exposes HTTP endpoints for specific school level management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read school levels.
 *
 * Endpoints:
 * - GET /api/school-levels/[id] - Get school level by ID
 *
 * Responses:
 * - 200 OK: Returns school level data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 404 Not Found: `{ error: string }` when level is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { schoolLevelsService } from "@/server/school-levels/school-levels.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/school-levels/[id]
 *
 * Returns a specific school level's information by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the level ID.
 * @returns A JSON `NextResponse` with the level data or an error payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const levelData = await schoolLevelsService.getSchoolLevelById({ userId }, { id });

    if (!levelData) {
      return NextResponse.json({ error: "School level not found" }, { status: 404 });
    }

    return NextResponse.json(levelData, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
