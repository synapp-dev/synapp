/**
 * Topics API route handler.
 *
 * Exposes HTTP endpoints for topic management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin role for management operations.
 *
 * Endpoints:
 * - GET /api/topics - List topics (all authenticated users can read)
 * - POST /api/topics - Create a new topic (platform admin only)
 *
 * Responses:
 * - 200 OK: Returns topic data or array of topics.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { topicsService } from "@/server/topics/topics.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/topics
 *
 * Returns a list of topics visible to the authenticated user.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the list of topics or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const topics = await topicsService.listTopics({ userId }, query);
    return NextResponse.json(topics, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle POST /api/topics
 *
 * Creates a new topic.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the created topic or an error payload.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const newTopic = await topicsService.createTopic({ userId }, body);
    return NextResponse.json(newTopic, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
