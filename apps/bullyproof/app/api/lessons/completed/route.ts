/**
 * Completed Lessons API route handler.
 *
 * Exposes HTTP GET endpoint for completed lessons metrics.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires admin_lessons feature for scope=all, otherwise filters by user's schools.
 *
 * Query parameters:
 * - scope: 'all' | 'school' (default: 'school')
 *   - 'all': Returns count of all completed lessons (requires admin_lessons)
 *   - 'school': Returns count of completed lessons in user's schools
 *
 * Responses:
 * - 200 OK: Returns metric data with current and previous month values.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { metricsService } from "@/server/metrics/metrics.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/lessons/completed
 *
 * Returns completed lessons count metrics for the authenticated user.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with metric data or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "school";

    const result = await metricsService.getCompletedLessonsCount(
      { userId },
      { scope: scope === "all" ? "all" : "school" }
    );

    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    console.error("[COMPLETED LESSONS METRIC] Error:", e);
    const status = e.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}

