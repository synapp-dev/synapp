/**
 * Me Schools API route handler.
 *
 * Exposes HTTP endpoints for getting user's schools.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 *
 * Endpoints:
 * - GET /api/me/schools - Get current user's schools
 *
 * Responses:
 * - 200 OK: Returns array of schools the user has access to.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { meService } from "@/server/me/me.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/me/schools
 *
 * Returns the current user's schools.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the user's schools or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const random = url.searchParams.get("random") === "true";
    const userIdParam = url.searchParams.get("userId");

    // If userId is provided, get schools for that specific user
    if (userIdParam) {
      const schools = await meService.getSchoolsByUserId(
        { userId },
        { id: userIdParam, limit }
      );
      return NextResponse.json(schools, { status: 200 });
    }

    // Otherwise, get schools for the current user
    const schools = await meService.getSchoolsByUserId(
      { userId },
      { id: userId, limit }
    );
    return NextResponse.json(schools, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
