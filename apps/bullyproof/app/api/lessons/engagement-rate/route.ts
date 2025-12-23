/**
 * Engagement Rate API route handler.
 *
 * Exposes HTTP GET endpoint for engagement rate metrics.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires PLATFORM_ADMIN role for scope=all, otherwise filters by user's schools.
 *
 * Query parameters:
 * - scope: 'all' | 'school' (default: 'school')
 *   - 'all': Returns engagement rate for all active schools (requires PLATFORM_ADMIN)
 *   - 'school': Returns engagement rate for user's active schools
 *
 * Formula: (lessons completed) / (total classes for active schools * active schools) * 100
 *
 * Responses:
 * - 200 OK: Returns metric data with current and previous month percentages (rounded to 2 decimal places).
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { metricsService } from "@/server/metrics/metrics.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/lessons/engagement-rate
 *
 * Returns engagement rate metrics for the authenticated user.
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

    const result = await metricsService.getEngagementRate(
      { userId },
      { scope: scope === "all" ? "all" : "school" }
    );

    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    console.error("[ENGAGEMENT RATE METRIC] Error:", e);
    const status =
      e.message?.includes("Unauthorized") || e.message?.includes("PLATFORM_ADMIN")
        ? 403
        : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}

