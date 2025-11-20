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
 * - GET /api/users?limit=...&offset=...&search=... - List all users with roles and schools (admin only)
 *
 * Responses:
 * - 200 OK: Returns user profile data or array of users.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { meService } from "@/server/me/me.service";
import { userService } from "@/server/user/user.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/users
 *
 * List all users with roles and schools, or search for a user by email (admin only).
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with user data or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    // If email parameter is provided, use the existing email search functionality
    if (email) {
      const user = await meService.getUserByEmail({ userId }, { email });
      return NextResponse.json(user, { status: 200 });
    }

    // Otherwise, list all users with roles and schools
    const query = Object.fromEntries(searchParams.entries());
    const users = await userService.listAllUsers({ userId }, query);
    return NextResponse.json(users, { status: 200 });
  } catch (e: any) {
    console.error(e);
    const status = e.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
