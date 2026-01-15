/**
 * Certification Topic by ID API route handler.
 *
 * Exposes HTTP endpoints for fetching and managing a specific certification topic with slides.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read certification topics.
 * - Requires platform admin role for management operations.
 *
 * Endpoints:
 * - GET /api/certification/topics/[topicId] - Get certification topic by ID with slides
 * - PUT /api/certification/topics/[topicId] - Update certification topic (platform admin only)
 * - DELETE /api/certification/topics/[topicId] - Delete certification topic (platform admin only)
 *
 * Responses:
 * - 200 OK: Returns topic data with slides or updated topic.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
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
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    
    const topic = await certificationTopicsService.getTopicById(
      { userId },
      topicId,
      query
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

/**
 * Handle PUT /api/certification/topics/[topicId]
 *
 * Updates a specific certification topic's information.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the topic ID.
 * @returns A JSON `NextResponse` with the updated topic data or an error payload.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicId } = await params;
    const body = await request.json();

    const updatedTopic = await certificationTopicsService.updateTopic(
      { userId },
      { id: topicId, ...body }
    );

    return NextResponse.json(updatedTopic, { status: 200 });
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
 * Handle DELETE /api/certification/topics/[topicId]
 *
 * Deletes a specific certification topic.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the topic ID.
 * @returns A JSON `NextResponse` with success confirmation or an error payload.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicId } = await params;
    await certificationTopicsService.deleteTopic({ userId }, { id: topicId });

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
