/**
 * Users API route handler.
 *
 * Exposes HTTP endpoints for user management (admin functions).
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin role for most operations.
 *
 * Endpoints:
 * - GET /api/users?email=... - Get user by email (admin only)
 *
 * Responses:
 * - 200 OK: Returns user profile data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { meService } from "@/server/me/me.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/users
 *
 * Search for users by email (admin only).
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the user profile or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    const user = await meService.getUserByEmail({ userId }, { email });
    return NextResponse.json(user, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
