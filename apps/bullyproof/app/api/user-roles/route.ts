/**
 * User Roles API route handler.
 *
 * Exposes HTTP endpoints for managing user role assignments.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin role for management operations.
 *
 * Endpoints:
 * - GET /api/user-roles?userId=... - Get user roles
 * - POST /api/user-roles - Assign role to user
 * - DELETE /api/user-roles - Remove role from user
 *
 * Responses:
 * - 200 OK: Returns role assignment data or array of user roles.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { rolesService } from "@/server/roles/roles.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/user-roles
 *
 * Returns user roles for a specific user.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the user roles or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return NextResponse.json(
        { error: "userId parameter is required" },
        { status: 400 }
      );
    }

    const userRoles = await rolesService.getUserRoles({ userId }, { userId: targetUserId });
    return NextResponse.json(userRoles, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle POST /api/user-roles
 *
 * Assigns a role to a user.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the role assignment or an error payload.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const assignment = await rolesService.assignRole({ userId }, body);
    return NextResponse.json(assignment, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/user-roles] Error:", e);
    
    // Check for PLATFORM_ADMIN constraint errors
    const errorMessage = e.message ?? "Internal error";
    if (
      errorMessage.includes("PLATFORM_ADMIN") ||
      errorMessage.includes("cannot have any other roles")
    ) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Handle DELETE /api/user-roles
 *
 * Removes a role from a user.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with success confirmation or an error payload.
 */
export async function DELETE(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    await rolesService.removeRole({ userId }, body);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
