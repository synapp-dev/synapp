/**
 * User by ID API route handler.
 *
 * Exposes HTTP endpoints for getting specific users by ID.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Users can access their own profile, admins can access any profile.
 *
 * Endpoints:
 * - GET /api/users/[id] - Get user by ID
 *
 * Responses:
 * - 200 OK: Returns user profile data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 404 Not Found: `{ error: string }` when user is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { meService } from "@/server/me/me.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/users/[id]
 *
 * Returns a specific user's profile information by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the user ID.
 * @returns A JSON `NextResponse` with the user profile or an error payload.
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
    const user = await meService.getUserById({ userId }, { id });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
