/**
 * Topics Reorder API route handler.
 *
 * Exposes HTTP endpoints for reordering topics within a stage.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin role for management operations.
 *
 * Endpoints:
 * - POST /api/topics/reorder - Reorder topics within a stage
 *
 * Responses:
 * - 200 OK: Returns success status.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { topicsService } from "@/server/topics/topics.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle POST /api/topics/reorder
 *
 * Reorders topics within a stage based on the provided array of topic IDs.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with success status or an error payload.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = await topicsService.reorderTopics({ userId }, body);
    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

