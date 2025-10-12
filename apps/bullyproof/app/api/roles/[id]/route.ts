/**
 * Role by ID API route handler.
 *
 * Exposes HTTP endpoints for managing specific roles by ID.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Platform admins can manage roles, platform/school admins can read.
 *
 * Endpoints:
 * - GET /api/roles/[id] - Get role by ID
 * - PUT /api/roles/[id] - Update role by ID
 * - DELETE /api/roles/[id] - Delete role by ID
 *
 * Responses:
 * - 200 OK: Returns role data or updated role.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 404 Not Found: `{ error: string }` when role is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { rolesService } from "@/server/roles/roles.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/roles/[id]
 *
 * Returns a specific role's information by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the role ID.
 * @returns A JSON `NextResponse` with the role data or an error payload.
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
    const roleData = await rolesService.getRoleById({ userId }, { id });

    if (!roleData) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(roleData, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle PUT /api/roles/[id]
 *
 * Updates a specific role by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the role ID.
 * @returns A JSON `NextResponse` with the updated role or an error payload.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const updatedRole = await rolesService.updateRole({ userId }, id, body);
    return NextResponse.json(updatedRole, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle DELETE /api/roles/[id]
 *
 * Deletes a specific role by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the role ID.
 * @returns A JSON `NextResponse` with success confirmation or an error payload.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await rolesService.deleteRole({ userId }, id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
