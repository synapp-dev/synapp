/**
 * Certification Topics by Slug API route handler.
 *
 * Exposes HTTP endpoints for fetching certification topics by course code and slug.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read certification topics.
 *
 * Endpoints:
 * - GET /api/certification/topics/by-slug/[courseCode]/[slug] - Get certification topic by slug
 *
 * Responses:
 * - 200 OK: Returns the certification topic.
 * - 404 Not Found: Topic not found.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { courseTopicsService } from "@/server/course-topics/course-topics.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/certification/topics/by-slug/[courseCode]/[slug]
 *
 * Returns a certification topic for a specific course code and slug.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the course code and slug.
 * @returns A JSON `NextResponse` with the topic or an error payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseCode: string; slug: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseCode, slug } = await params;
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    
    const topic = await courseTopicsService.getTopicBySlug(
      { userId },
      { courseCode, slug, ...query }
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
