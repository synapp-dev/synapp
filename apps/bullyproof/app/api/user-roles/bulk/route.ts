/**
 * Bulk User Roles API route handler.
 *
 * Exposes HTTP endpoints for bulk managing user role assignments.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin role for management operations.
 *
 * Endpoints:
 * - POST /api/user-roles/bulk - Bulk assign or remove roles for multiple users
 *
 * Responses:
 * - 200 OK: Returns bulk operation results.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { rolesService } from "@/server/roles/roles.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { handleDatabaseError } from "@/utils/db-error-handler";

type BulkRoleRequest = {
  schoolId: string;
  emails: string[];
  roleIds: string[];
  action: "assign" | "remove";
};

/**
 * Handle POST /api/user-roles/bulk
 *
 * Bulk assigns or removes roles for multiple users.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with bulk operation results or an error payload.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: BulkRoleRequest = await request.json();

    // Validate request body
    if (!body.schoolId || !Array.isArray(body.emails) || !Array.isArray(body.roleIds) || !body.action) {
      return NextResponse.json(
        { error: "Invalid request body. schoolId, emails, roleIds, and action are required." },
        { status: 400 }
      );
    }

    if (body.emails.length === 0) {
      return NextResponse.json(
        { error: "At least one email is required." },
        { status: 400 }
      );
    }

    if (body.roleIds.length === 0) {
      return NextResponse.json(
        { error: "At least one role is required." },
        { status: 400 }
      );
    }

    if (body.action !== "assign" && body.action !== "remove") {
      return NextResponse.json(
        { error: "Action must be either 'assign' or 'remove'." },
        { status: 400 }
      );
    }

    // Process bulk operation
    const result = await rolesService.bulkAssignOrRemoveRoles(
      { userId },
      body
    );

    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    console.error("[POST /api/user-roles/bulk] Error:", e);

    // Check for business logic errors
    const errorMessage = e.message ?? "Internal error";
    if (errorMessage.includes("cannot have any other roles")) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Handle database errors
    const dbError = handleDatabaseError(e, errorMessage);
    return NextResponse.json({ error: dbError.error }, { status: dbError.status });
  }
}
