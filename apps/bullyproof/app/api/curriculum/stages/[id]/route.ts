/**
 * Curriculum Stage by ID API route handler.
 *
 * Exposes HTTP endpoints for specific curriculum stage management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read curriculum data.
 * - Requires platform admin role for management operations.
 *
 * Endpoints:
 * - GET /api/curriculum/stages/[id] - Get curriculum stage by ID
 * - PUT /api/curriculum/stages/[id] - Update curriculum stage (platform admin only)
 * - DELETE /api/curriculum/stages/[id] - Delete curriculum stage (platform admin only)
 *
 * Responses:
 * - 200 OK: Returns curriculum stage data or updated stage.
 * - 201 Created: Returns the created curriculum stage.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 404 Not Found: `{ error: string }` when stage is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { curriculumService } from "@/server/curriculum/curriculum.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/curriculum/stages/[id]
 *
 * Returns a specific curriculum stage's information by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the stage ID.
 * @returns A JSON `NextResponse` with the stage data or an error payload.
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
    const stageData = await curriculumService.getStageById({ userId }, { id });

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

/**
 * Handle PUT /api/curriculum/stages/[id]
 *
 * Updates a specific curriculum stage's information.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the stage ID.
 * @returns A JSON `NextResponse` with the updated stage data or an error payload.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updatedStage = await curriculumService.updateStage(
      { userId },
      { id, ...body }
    );

    return NextResponse.json(updatedStage, { status: 200 });
  } catch (e: any) {
    console.error(e);
    const status = e.message?.includes("Unauthorized")
      ? 403
      : e.message?.includes("not found")
        ? 404
        : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}

/**
 * Handle DELETE /api/curriculum/stages/[id]
 *
 * Deletes a specific curriculum stage.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the stage ID.
 * @returns A JSON `NextResponse` with success confirmation or an error payload.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await curriculumService.deleteStage({ userId }, { id });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    const status = e.message?.includes("Unauthorized")
      ? 403
      : e.message?.includes("not found")
        ? 404
        : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
