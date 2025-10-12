/**
 * Curriculum Stages API route handler.
 *
 * Exposes HTTP endpoints for curriculum stage management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read curriculum data.
 *
 * Endpoints:
 * - GET /api/curriculum/stages - List curriculum stages
 *
 * Responses:
 * - 200 OK: Returns curriculum stage data or array of stages.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { curriculumService } from "@/server/curriculum/curriculum.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/curriculum/stages
 *
 * Returns a list of curriculum stages.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the list of stages or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const stages = await curriculumService.getStages({ userId }, query);
    return NextResponse.json(stages, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
