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
import { db } from "@/server/db/drizzle";
import { userProfile, roles, schools } from "@/server/db/schema";
import { eq } from "drizzle-orm";

type RoleLog = {
  action: "assigned" | "removed";
  roleId: string;
  roleName: string;
  roleKey: string | null;
  schoolId: string | null;
  schoolName: string | null;
  updatedAt: string;
  updatedBy: string;
};

type UserMetadata = {
  roleLogs?: RoleLog[];
  [key: string]: unknown;
};

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

    const userRoles = await rolesService.getUserRoles(
      { userId },
      { userId: targetUserId }
    );
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

    // Get role and school info before assignment for logging
    const [roleResult] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, body.roleId))
      .limit(1);

    let schoolName: string | null = null;
    if (body.schoolId) {
      const [schoolResult] = await db
        .select()
        .from(schools)
        .where(eq(schools.id, body.schoolId))
        .limit(1);
      schoolName = schoolResult?.name || null;
    }

    const assignment = await rolesService.assignRole({ userId }, body);

    // Log role assignment in user metadata
    const [currentUser] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.id, body.userId))
      .limit(1);

    if (currentUser) {
      const currentMetadata =
        (currentUser.metadata as UserMetadata | null) || ({} as UserMetadata);
      const roleLogs = Array.isArray(currentMetadata.roleLogs)
        ? currentMetadata.roleLogs
        : [];

      roleLogs.push({
        action: "assigned",
        roleId: body.roleId,
        roleName: roleResult?.name || "Unknown Role",
        roleKey: roleResult?.key || null,
        schoolId: body.schoolId || null,
        schoolName: schoolName,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      });

      await db
        .update(userProfile)
        .set({
          metadata: {
            ...currentMetadata,
            roleLogs,
          },
        })
        .where(eq(userProfile.id, body.userId));
    }

    return NextResponse.json(assignment, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/user-roles] Error:", e);

    // Check for PLATFORM_ADMIN constraint errors
    const errorMessage = e.message ?? "Internal error";
    if (
      errorMessage.includes("PLATFORM_ADMIN") ||
      errorMessage.includes("cannot have any other roles")
    ) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
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

    // Get role and school info before removal for logging
    const [roleResult] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, body.roleId))
      .limit(1);

    let schoolName: string | null = null;
    if (body.schoolId) {
      const [schoolResult] = await db
        .select()
        .from(schools)
        .where(eq(schools.id, body.schoolId))
        .limit(1);
      schoolName = schoolResult?.name || null;
    }

    await rolesService.removeRole({ userId }, body);

    // Log role removal in user metadata
    const [currentUser] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.id, body.userId))
      .limit(1);

    if (currentUser) {
      const currentMetadata =
        (currentUser.metadata as UserMetadata | null) || ({} as UserMetadata);
      const roleLogs = Array.isArray(currentMetadata.roleLogs)
        ? currentMetadata.roleLogs
        : [];

      roleLogs.push({
        action: "removed",
        roleId: body.roleId,
        roleName: roleResult?.name || "Unknown Role",
        roleKey: roleResult?.key || null,
        schoolId: body.schoolId || null,
        schoolName: schoolName,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      });

      await db
        .update(userProfile)
        .set({
          metadata: {
            ...currentMetadata,
            roleLogs,
          },
        })
        .where(eq(userProfile.id, body.userId));
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
