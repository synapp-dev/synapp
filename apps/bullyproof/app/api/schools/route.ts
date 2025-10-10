/**
 * Schools API route handler.
 *
 * Exposes an HTTP GET endpoint to list schools visible to the authenticated user.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 *
 * Query parameters:
 * - All query string parameters are forwarded as-is to the underlying service
 *   and may be used for filtering, pagination, or sorting depending on the
 *   service implementation.
 *
 * Responses:
 * - 200 OK: Returns an array of schools (shape defined by the service layer).
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { schoolService } from "@/server/school/school.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/schools
 *
 * Extracts query parameters, validates the requester is authenticated, then
 * delegates to `schoolService.listSchools` to fetch visible schools for the
 * current user.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the list of schools or an error payload.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await schoolService.listSchools({ userId }, query);
    return NextResponse.json(rows, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
