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
import { handleDatabaseError } from "@/utils/db-error-handler";

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

    // Batch fetch role, school, and user info in parallel for better performance
    const [roleResults, schoolResults, userResults] = await Promise.all([
      db.select().from(roles).where(eq(roles.id, body.roleId)).limit(1),
      body.schoolId
        ? db.select().from(schools).where(eq(schools.id, body.schoolId)).limit(1)
        : Promise.resolve([]),
      db.select().from(userProfile).where(eq(userProfile.id, body.userId)).limit(1),
    ]);

    const [roleResult] = roleResults;
    const [schoolResult] = schoolResults;
    const [currentUser] = userResults;
    const schoolName = schoolResult?.name || null;

    // Use transaction to ensure atomicity: role assignment + metadata update
    const assignment = await db.transaction(async (tx) => {
      // Assign role within transaction
      const assignmentResult = await rolesService.assignRole({ userId }, body, tx as any);

      // Log role assignment in user metadata within transaction
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

        await tx
          .update(userProfile)
          .set({
            metadata: {
              ...currentMetadata,
              roleLogs,
            },
          })
          .where(eq(userProfile.id, body.userId));
      }

      return assignmentResult;
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/user-roles] Error:", e);

    // Check for PLATFORM_ADMIN constraint errors (business logic errors)
    const errorMessage = e.message ?? "Internal error";
    if (
      errorMessage.includes("PLATFORM_ADMIN") ||
      errorMessage.includes("cannot have any other roles")
    ) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Handle database errors
    const dbError = handleDatabaseError(e, errorMessage);
    return NextResponse.json({ error: dbError.error }, { status: dbError.status });
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

    // Batch fetch role, school, and user info in parallel for better performance
    const [roleResults, schoolResults, userResults] = await Promise.all([
      db.select().from(roles).where(eq(roles.id, body.roleId)).limit(1),
      body.schoolId
        ? db.select().from(schools).where(eq(schools.id, body.schoolId)).limit(1)
        : Promise.resolve([]),
      db.select().from(userProfile).where(eq(userProfile.id, body.userId)).limit(1),
    ]);

    const [roleResult] = roleResults;
    const [schoolResult] = schoolResults;
    const [currentUser] = userResults;
    const schoolName = schoolResult?.name || null;

    // Use transaction to ensure atomicity: role removal + metadata update
    await db.transaction(async (tx) => {
      // Remove role within transaction
      await rolesService.removeRole({ userId }, body, tx as any);

      // Log role removal in user metadata within transaction
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

        await tx
          .update(userProfile)
          .set({
            metadata: {
              ...currentMetadata,
              roleLogs,
            },
          })
          .where(eq(userProfile.id, body.userId));
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error("[DELETE /api/user-roles] Error:", e);
    const dbError = handleDatabaseError(e, e.message ?? "Internal error");
    return NextResponse.json(
      { error: dbError.error },
      { status: dbError.status }
    );
  }
}
