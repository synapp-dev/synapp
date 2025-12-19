/**
 * Platform Admin User Creation API route handler.
 *
 * Exposes HTTP endpoint for creating new platform admin users.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin role for creating platform admins.
 *
 * Endpoints:
 * - POST /api/users/new/platform-admin - Create a new platform admin user
 *
 * Responses:
 * - 201 Created: Returns the created user data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle POST /api/users/new/platform-admin
 *
 * Creates a new platform admin user.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the created user or an error payload.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // TODO: Implement platform admin user creation logic
    // - Validate request body
    // - Check permissions (must be platform admin)
    // - Create user in auth.users with platform admin role
    // - Create user_profile entry
    // - Assign PLATFORM_ADMIN role

    console.log("[PLATFORM ADMIN CREATE] Request received:", {
      userId,
      body,
    });

    return NextResponse.json(
      { message: "Platform admin user creation not yet implemented" },
      { status: 501 }
    );
  } catch (e: any) {
    console.error("[PLATFORM ADMIN CREATE] Error:", {
      error: e,
      message: e?.message,
      stack: e?.stack,
    });
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
