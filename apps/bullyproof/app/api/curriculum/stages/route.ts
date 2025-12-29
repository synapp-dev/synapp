/**
 * Curriculum Stages API route handler.
 *
 * Exposes HTTP endpoints for curriculum stage management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read curriculum data.
 * - Requires platform admin role for management operations.
 *
 * Endpoints:
 * - GET /api/curriculum/stages - List curriculum stages
 * - POST /api/curriculum/stages - Create a new curriculum stage (platform admin only)
 *
 * Responses:
 * - 200 OK: Returns curriculum stage data or array of stages.
 * - 201 Created: Returns the created curriculum stage.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
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

/**
 * Handle POST /api/curriculum/stages
 *
 * Creates a new curriculum stage.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the created stage or an error payload.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const newStage = await curriculumService.createStage({ userId }, body);
    return NextResponse.json(newStage, { status: 201 });
  } catch (e: any) {
    console.error(e);
    const status = e.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
