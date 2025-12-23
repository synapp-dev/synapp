/**
 * Schools API route handler.
 *
 * Exposes HTTP GET and POST endpoints for schools.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 *
 * Query parameters (GET):
 * - All query string parameters are forwarded as-is to the underlying service
 *   and may be used for filtering, pagination, or sorting depending on the
 *   service implementation.
 *
 * Request body (POST):
 * - { name: string, stateId: string, sectorId: string, levelIds: string[] }
 *
 * Responses:
 * - GET 200 OK: Returns an array of schools (shape defined by the service layer).
 * - POST 201 Created: Returns the created school.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { schoolService } from "@/server/school/school.service";
import { metricsService } from "@/server/metrics/metrics.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/schools
 *
 * Extracts query parameters, validates the requester is authenticated, then
 * delegates to `schoolService.listSchools` to fetch visible schools for the
 * current user.
 *
 * Query parameters:
 * - metric: 'count' - Returns count metric instead of list of schools
 * - scope: 'all' | 'school' (only used with metric=count)
 *   - 'all': Returns count of all schools (requires PLATFORM_ADMIN)
 *   - 'school': Returns count of user's schools
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the list of schools or metric data or an error payload.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if this is a metric request
    const metric = searchParams.get("metric");
    if (metric === "count") {
      const scope = searchParams.get("scope") || "school";
      const result = await metricsService.getSchoolCount(
        { userId },
        { scope: scope === "all" ? "all" : "school" }
      );
      return NextResponse.json(result, { status: 200 });
    }

    // Otherwise, return list of schools (existing behavior)
    const query = Object.fromEntries(searchParams.entries());
    const rows = await schoolService.listSchools({ userId }, query);
    return NextResponse.json(rows, { status: 200 });
  } catch (e: any) {
    console.error(e);
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

/**
 * Handle POST /api/schools
 *
 * Creates a new school with the provided name, state, sector, and level assignments.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the created school.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, stateId, sectorId, levelIds } = body;

    if (!name || !stateId || !sectorId || !levelIds) {
      return NextResponse.json(
        { error: "School name, state ID, sector ID, and level IDs are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(levelIds) || levelIds.length === 0) {
      return NextResponse.json(
        { error: "At least one school level is required" },
        { status: 400 }
      );
    }

    // Create the school
    const createdSchool = await schoolService.createSchool(
      { userId },
      { name, stateId, sectorId, levelIds }
    );

    if (!createdSchool) {
      return NextResponse.json(
        { error: "Failed to create school" },
        { status: 500 }
      );
    }

    return NextResponse.json(createdSchool, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
