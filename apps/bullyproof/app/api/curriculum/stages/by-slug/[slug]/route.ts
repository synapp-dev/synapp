/**
 * Curriculum Stage by Slug API route handler.
 *
 * Exposes HTTP endpoints for specific curriculum stage management by slug.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read curriculum data.
 *
 * Endpoints:
 * - GET /api/curriculum/stages/by-slug/[slug] - Get curriculum stage by slug
 *
 * Responses:
 * - 200 OK: Returns curriculum stage data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 404 Not Found: `{ error: string }` when stage is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { curriculumService } from "@/server/curriculum/curriculum.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/curriculum/stages/by-slug/[slug]
 *
 * Returns a specific curriculum stage's information by slug.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the stage slug.
 * @returns A JSON `NextResponse` with the stage data or an error payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const stageData = await curriculumService.getStageBySlug(
      { userId },
      { slug }
    );

    if (!stageData) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    return NextResponse.json(stageData, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
