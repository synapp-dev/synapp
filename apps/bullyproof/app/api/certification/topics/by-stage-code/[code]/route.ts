/**
 * Certification Topics by Stage Code API route handler.
 *
 * Exposes HTTP endpoints for fetching certification topics by stage code.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read certification topics.
 *
 * Endpoints:
 * - GET /api/certification/topics/by-stage-code/[code] - Get certification topics by stage code
 *
 * Responses:
 * - 200 OK: Returns array of certification topics.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { certificationTopicsService } from "@/server/certification-topics/certification-topics.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/certification/topics/by-stage-code/[code]
 *
 * Returns certification topics for a specific stage code.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the stage code.
 * @returns A JSON `NextResponse` with the topics array or an error payload.
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
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    
    const topics = await certificationTopicsService.getTopicsByStageCode(
      { userId },
      { code, ...query }
    );

    return NextResponse.json(topics, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
