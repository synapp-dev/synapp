/**
 * Certification Topic by ID API route handler.
 *
 * Exposes HTTP endpoints for fetching a specific certification topic with slides.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read certification topics.
 *
 * Endpoints:
 * - GET /api/certification/topics/[topicId] - Get certification topic by ID with slides
 *
 * Responses:
 * - 200 OK: Returns topic data with slides.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 404 Not Found: `{ error: string }` when topic is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { certificationTopicsService } from "@/server/certification-topics/certification-topics.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/certification/topics/[topicId]
 *
 * Returns a specific certification topic's information with slides.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the topic ID.
 * @returns A JSON `NextResponse` with the topic data or an error payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicId } = await params;
    const topic = await certificationTopicsService.getTopicById(
      { userId },
      topicId
    );

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    return NextResponse.json(topic, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
