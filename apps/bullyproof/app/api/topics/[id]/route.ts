/**
 * Topic by ID API route handler.
 *
 * Exposes HTTP endpoints for managing specific topics by ID.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Platform admins can manage topics, all authenticated users can read.
 *
 * Endpoints:
 * - GET /api/topics/[id] - Get topic by ID
 * - PUT /api/topics/[id] - Update topic by ID
 * - DELETE /api/topics/[id] - Delete topic by ID
 *
 * Responses:
 * - 200 OK: Returns topic data or updated topic.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 404 Not Found: `{ error: string }` when topic is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { topicsService } from "@/server/topics/topics.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/topics/[id]
 *
 * Returns a specific topic's information by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the topic ID.
 * @returns A JSON `NextResponse` with the topic data or an error payload.
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
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    const topicData = await topicsService.getTopicById({ userId }, { id, ...query });

    if (!topicData) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    return NextResponse.json(topicData, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle PUT /api/topics/[id]
 *
 * Updates a specific topic by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the topic ID.
 * @returns A JSON `NextResponse` with the updated topic or an error payload.
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
    const updatedTopic = await topicsService.updateTopic({ userId }, id, body);
    return NextResponse.json(updatedTopic, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle DELETE /api/topics/[id]
 *
 * Deletes a specific topic by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the topic ID.
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
    await topicsService.deleteTopic({ userId }, id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
