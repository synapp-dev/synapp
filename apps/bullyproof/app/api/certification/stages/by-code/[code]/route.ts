/**
 * Certification Stage by Code API route handler.
 *
 * Exposes HTTP endpoints for specific certification stage management by code.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read certification data.
 *
 * Endpoints:
 * - GET /api/certification/stages/by-code/[code] - Get certification stage by code
 *
 * Responses:
 * - 200 OK: Returns certification stage data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 404 Not Found: `{ error: string }` when stage is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { certificationService } from "@/server/certification/certification.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/certification/stages/by-code/[code]
 *
 * Returns a specific certification stage's information by code.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the stage code.
 * @returns A JSON `NextResponse` with the stage data or an error payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const stageData = await certificationService.getStageByCode(
      { userId },
      { code }
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
