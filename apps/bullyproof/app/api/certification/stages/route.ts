/**
 * Certification Stages API route handler.
 *
 * Exposes HTTP endpoints for certification stage management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read certification data.
 *
 * Endpoints:
 * - GET /api/certification/stages - List certification stages
 *
 * Responses:
 * - 200 OK: Returns certification stage data or array of stages.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
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
