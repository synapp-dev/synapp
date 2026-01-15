/**
 * Certification Stages API route handler.
 *
 * Exposes HTTP endpoints for certification stage management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read certification data.
 * - Requires platform admin role for management operations.
 *
 * Endpoints:
 * - GET /api/certification/stages - List certification stages
 * - POST /api/certification/stages - Create a new certification stage (platform admin only)
 *
 * Responses:
 * - 200 OK: Returns certification stage data or array of stages.
 * - 201 Created: Returns the created certification stage.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { certificationService } from "@/server/certification/certification.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/certification/stages
 *
 * Returns a list of certification stages.
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

    const stages = await certificationService.getStages({ userId }, query);
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
 * Handle POST /api/certification/stages
 *
 * Creates a new certification stage.
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
    const newStage = await certificationService.createStage({ userId }, body);
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
