/**
 * Topic Slides Reorder API route handler.
 *
 * Exposes HTTP endpoint for bulk reordering slides.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Platform admins can manage slides.
 *
 * Endpoints:
 * - POST /api/topic-slides/reorder - Reorder slides in bulk
 *
 * Request Body:
 * {
 *   topicId: string;
 *   slideIds: string[]; // Array of slide IDs in the desired order
 * }
 *
 * Responses:
 * - 200 OK: Returns success object.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { topicsService } from "@/server/topics/topics.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle POST /api/topic-slides/reorder
 *
 * Reorders slides in bulk based on an array of slide IDs.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with a success object or an error payload.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    await topicsService.reorderSlides({ userId }, body);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
