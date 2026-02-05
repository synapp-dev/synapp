/**
 * Delete User Slide Views by Topic API route handler.
 *
 * Exposes HTTP endpoint for deleting all slide views for a user within a specific topic.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Users can only delete their own slide views.
 *
 * Endpoints:
 * - POST /api/user-slide-views/delete-by-topic - Delete all slide views for a topic
 *
 * Request body:
 * - { topicId: string }
 *
 * Responses:
 * - 200 OK: Returns success confirmation.
 * - 400 Bad Request: `{ error: string }` when topicId is missing.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { userSlideViewsRepo } from "@/server/user-slide-views/user-slide-views.repo";

/**
 * Handle POST /api/user-slide-views/delete-by-topic
 *
 * Deletes all slide views for the authenticated user within the specified topic.
 *
 * @param request The incoming HTTP request containing topicId.
 * @returns A JSON `NextResponse` with success confirmation or an error payload.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { topicId } = body;

    if (!topicId) {
      return NextResponse.json(
        { error: "topicId is required" },
        { status: 400 }
      );
    }

    await userSlideViewsRepo.deleteByUserAndTopic(userId, topicId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error("Error deleting slide views:", e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
