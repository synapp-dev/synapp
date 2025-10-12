/**
 * Curriculum Years API route handler.
 *
 * Exposes HTTP endpoints for school year management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read curriculum data.
 *
 * Endpoints:
 * - GET /api/curriculum/years - List school years
 *
 * Responses:
 * - 200 OK: Returns school year data or array of years.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { curriculumService } from "@/server/curriculum/curriculum.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/curriculum/years
 *
 * Returns a list of school years.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the list of years or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const years = await curriculumService.getYears({ userId }, query);
    return NextResponse.json(years, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
