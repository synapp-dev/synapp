/**
 * Bulk User Deletion API route handler.
 *
 * Exposes HTTP endpoint for deleting multiple users in bulk.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin role for deleting users.
 *
 * Endpoints:
 * - DELETE /api/users/delete - Delete multiple users
 *
 * Responses:
 * - 200 OK: Returns deletion results.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { getUserScopedRoles } from "@/server/auth/rbac";
import { createServerAdminClient } from "@/utils/supabase/admin";
import { db } from "@/server/db/drizzle";
import { userRoles, teacherClasses, userSchoolPositions } from "@/server/db/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

// Request body schema for bulk deletion
const bulkDeleteSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1),
});

/**
 * Handle DELETE /api/users/delete
 *
 * Deletes multiple users from auth and all related records.
 * Only platform admins can delete users.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the deletion results or an error payload.
 */
export async function DELETE(request: Request) {
  const startTime = Date.now();
  console.log("[BULK USER DELETE] ====== START ======");

  try {
    // Step 1: Get user ID
    console.log("[BULK USER DELETE] Step 1: Getting user ID from request...");
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      console.error("[BULK USER DELETE] Step 1: No userId returned");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[BULK USER DELETE] Step 1: Success, userId:", userId);

    // Step 2: Check permissions
    console.log("[BULK USER DELETE] Step 2: Checking permissions...");
    const roles = await getUserScopedRoles(userId);
    const isPlatformAdmin = roles.platform.includes("PLATFORM_ADMIN");

    if (!isPlatformAdmin) {
      console.error("[BULK USER DELETE] Step 2: Unauthorized - insufficient permissions:", {
        userId,
        platformRoles: roles.platform,
      });
      return NextResponse.json(
        { error: "Unauthorized - Platform admin role required" },
        { status: 403 }
      );
    }

    console.log("[BULK USER DELETE] Step 2: Success, user is platform admin");

    // Step 3: Parse request body
    console.log("[BULK USER DELETE] Step 3: Parsing request body...");
    let body: any;
    try {
      body = await request.json();
      console.log("[BULK USER DELETE] Step 3: Success, body parsed:", {
        userIdCount: body.userIds?.length || 0,
      });
    } catch (error: any) {
      console.error("[BULK USER DELETE] Step 3: Failed to parse request body:", {
        error: error.message,
      });
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Step 4: Validate request body
    console.log("[BULK USER DELETE] Step 4: Validating request body...");
    let data: z.infer<typeof bulkDeleteSchema>;
    try {
      data = bulkDeleteSchema.parse(body);
      console.log("[BULK USER DELETE] Step 4: Success, validated data:", {
        userIdCount: data.userIds.length,
      });
    } catch (error: any) {
      console.error("[BULK USER DELETE] Step 4: Validation failed:", {
        error: error.message,
        issues: error instanceof z.ZodError ? error.issues : undefined,
      });
      return NextResponse.json(
        { error: "Validation error", details: error instanceof z.ZodError ? error.issues : error.message },
        { status: 400 }
      );
    }

    // Step 5: Get admin client
    console.log("[BULK USER DELETE] Step 5: Creating admin client...");
    const adminClient = await createServerAdminClient();
    console.log("[BULK USER DELETE] Step 5: Success, admin client created");

    const results = {
      successful: [] as string[],
      failed: [] as Array<{ userId: string; error: string }>,
    };

    // Step 6: Delete each user from auth (must be sequential due to Supabase API)
    console.log(`[BULK USER DELETE] Step 6: Deleting ${data.userIds.length} users from auth...`);
    const successfullyDeletedUserIds: string[] = [];
    
    for (const targetUserId of data.userIds) {
      try {
        console.log(`[BULK USER DELETE] Deleting user: ${targetUserId}`);

        // Delete from auth.users using Supabase admin API
        // This will cascade to user_profile due to foreign key constraint
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(
          targetUserId
        );

        if (deleteError) {
          console.error(
            `[BULK USER DELETE] Failed to delete user ${targetUserId} from auth:`,
            deleteError
          );
          results.failed.push({
            userId: targetUserId,
            error: deleteError.message,
          });
          continue;
        }

        successfullyDeletedUserIds.push(targetUserId);
        console.log(`[BULK USER DELETE] Successfully deleted user from auth: ${targetUserId}`);
      } catch (error: any) {
        console.error(
          `[BULK USER DELETE] Error deleting user ${targetUserId}:`,
          error
        );
        results.failed.push({
          userId: targetUserId,
          error: error.message || "Unknown error",
        });
      }
    }

    // Step 7: Batch delete from related tables (defensive - cascade should handle these)
    if (successfullyDeletedUserIds.length > 0) {
      console.log(`[BULK USER DELETE] Step 7: Batch deleting related records for ${successfullyDeletedUserIds.length} users...`);
      try {
        // Use Promise.all to delete from multiple tables in parallel using inArray
        await Promise.all([
          // Delete from user_roles (references usersInAuth.id, should cascade but being explicit)
          db.delete(userRoles).where(inArray(userRoles.userId, successfullyDeletedUserIds)),
          
          // Delete from teacher_classes (references userProfile.id, should cascade but being explicit)
          db.delete(teacherClasses).where(inArray(teacherClasses.userId, successfullyDeletedUserIds)),
          
          // Delete from user_school_positions (references userProfile.id, should cascade but being explicit)
          db.delete(userSchoolPositions).where(inArray(userSchoolPositions.userId, successfullyDeletedUserIds)),
        ]);
        console.log(`[BULK USER DELETE] Successfully batch deleted related records`);
      } catch (dbError: any) {
        // Log but don't fail - cascade should have handled these
        console.warn(
          `[BULK USER DELETE] Warning: Error batch deleting related records:`,
          dbError.message || dbError.error || "Unknown error"
        );
        // Fallback to individual deletions if batch fails
        for (const userId of successfullyDeletedUserIds) {
          try {
            await Promise.all([
              db.delete(userRoles).where(eq(userRoles.userId, userId)),
              db.delete(teacherClasses).where(eq(teacherClasses.userId, userId)),
              db.delete(userSchoolPositions).where(eq(userSchoolPositions.userId, userId)),
            ]);
          } catch (err: any) {
            // Ignore errors - cascade should have handled these
            console.warn(`[BULK USER DELETE] Warning deleting related records for ${userId}:`, err.message);
          }
        }
      }
    }

    // Add successful results
    results.successful.push(...successfullyDeletedUserIds);

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log("[BULK USER DELETE] ====== END ======", {
      duration: `${duration}ms`,
      successful: results.successful.length,
      failed: results.failed.length,
    });

    return NextResponse.json(
      {
        success: true,
        deleted: results.successful.length,
        failed: results.failed.length,
        results,
      },
      { status: 200 }
    );
  } catch (e: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.error("[BULK USER DELETE] ====== ERROR ======", {
      error: e,
      message: e?.message,
      stack: e?.stack,
      duration: `${duration}ms`,
    });

    const status =
      e.message?.includes("Unauthorized") ||
      e.message?.includes("Platform admin role required")
        ? 403
        : e.message?.includes("Validation")
          ? 400
          : 500;

    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
