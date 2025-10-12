/**
 * Curriculum Year by ID API route handler.
 *
 * Exposes HTTP endpoints for specific school year management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read curriculum data.
 *
 * Endpoints:
 * - GET /api/curriculum/years/[id] - Get school year by ID
 *
 * Responses:
 * - 200 OK: Returns school year data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 404 Not Found: `{ error: string }` when year is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { curriculumService } from "@/server/curriculum/curriculum.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/curriculum/years/[id]
 *
 * Returns a specific school year's information by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the year ID.
 * @returns A JSON `NextResponse` with the year data or an error payload.
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
    const yearData = await curriculumService.getYearById({ userId }, { id });

    if (!yearData) {
      return NextResponse.json({ error: "Year not found" }, { status: 404 });
    }

    return NextResponse.json(yearData, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
