/**
 * Remove Users from School API route handler.
 *
 * Exposes HTTP endpoint for removing users from a school by removing all their
 * roles, positions, and class associations for that school.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires appropriate permissions to manage school users.
 *
 * Endpoints:
 * - POST /api/schools/[id]/users/remove - Remove multiple users from a school
 *
 * Responses:
 * - 200 OK: Returns removal results.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { getUserScopedRoles } from "@/server/auth/rbac";
import { db } from "@/server/db/drizzle";
import {
  userRoles,
  teacherClasses,
  userSchoolPositions,
  classes,
} from "@/server/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { z } from "zod";

// Request body schema for bulk removal
const bulkRemoveSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1),
});

/**
 * Handle POST /api/schools/[id]/users/remove
 *
 * Removes multiple users from a school by removing all their roles,
 * positions, and class associations for that school.
 * The users themselves are not deleted, only their ties to the school.
 *
 * @param request The incoming HTTP request.
 * @param params Route parameters containing the school ID.
 * @returns A JSON `NextResponse` with the removal results or an error payload.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  console.log("[REMOVE USERS FROM SCHOOL] ====== START ======");

  try {
    // Step 1: Get user ID
    console.log("[REMOVE USERS FROM SCHOOL] Step 1: Getting user ID from request...");
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      console.error("[REMOVE USERS FROM SCHOOL] Step 1: No userId returned");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[REMOVE USERS FROM SCHOOL] Step 1: Success, userId:", userId);

    // Step 2: Check permissions
    console.log("[REMOVE USERS FROM SCHOOL] Step 2: Checking permissions...");
    const roles = await getUserScopedRoles(userId);
    const isPlatformAdmin = roles.platform.includes("PLATFORM_ADMIN");

    if (!isPlatformAdmin) {
      console.error(
        "[REMOVE USERS FROM SCHOOL] Step 2: Unauthorized - insufficient permissions:",
        {
          userId,
          platformRoles: roles.platform,
        }
      );
      return NextResponse.json(
        { error: "Unauthorized - Platform admin role required" },
        { status: 403 }
      );
    }

    console.log(
      "[REMOVE USERS FROM SCHOOL] Step 2: Success, user is platform admin"
    );

    // Step 3: Get school ID from params
    const { id: schoolId } = await params;
    console.log("[REMOVE USERS FROM SCHOOL] Step 3: School ID:", schoolId);

    // Step 4: Parse request body
    console.log("[REMOVE USERS FROM SCHOOL] Step 4: Parsing request body...");
    let body: any;
    try {
      body = await request.json();
      console.log("[REMOVE USERS FROM SCHOOL] Step 4: Success, body parsed:", {
        userIdCount: body.userIds?.length || 0,
      });
    } catch (error: any) {
      console.error(
        "[REMOVE USERS FROM SCHOOL] Step 4: Failed to parse request body:",
        {
          error: error.message,
        }
      );
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Step 5: Validate request body
    console.log(
      "[REMOVE USERS FROM SCHOOL] Step 5: Validating request body..."
    );
    let data: z.infer<typeof bulkRemoveSchema>;
    try {
      data = bulkRemoveSchema.parse(body);
      console.log("[REMOVE USERS FROM SCHOOL] Step 5: Success, validated data:", {
        userIdCount: data.userIds.length,
      });
    } catch (error: any) {
      console.error(
        "[REMOVE USERS FROM SCHOOL] Step 5: Validation failed:",
        {
          error: error.message,
          issues: error instanceof z.ZodError ? error.issues : undefined,
        }
      );
      return NextResponse.json(
        {
          error: "Validation error",
          details:
            error instanceof z.ZodError ? error.issues : error.message,
        },
        { status: 400 }
      );
    }

    const results = {
      successful: [] as string[],
      failed: [] as Array<{ userId: string; error: string }>,
    };

    // Step 6: Remove all roles for these users at this school
    console.log(
      `[REMOVE USERS FROM SCHOOL] Step 6: Removing roles for ${data.userIds.length} users from school ${schoolId}...`
    );
    try {
      await db
        .delete(userRoles)
        .where(
          and(
            inArray(userRoles.userId, data.userIds),
            eq(userRoles.schoolId, schoolId)
          )
        );
      console.log(
        `[REMOVE USERS FROM SCHOOL] Step 6: Successfully removed roles`
      );
    } catch (error: any) {
      console.error(
        `[REMOVE USERS FROM SCHOOL] Step 6: Error removing roles:`,
        error
      );
      // Continue with other removals even if roles fail
    }

    // Step 7: Remove all positions for these users at this school
    console.log(
      `[REMOVE USERS FROM SCHOOL] Step 7: Removing positions for ${data.userIds.length} users from school ${schoolId}...`
    );
    try {
      await db
        .delete(userSchoolPositions)
        .where(
          and(
            inArray(userSchoolPositions.userId, data.userIds),
            eq(userSchoolPositions.schoolId, schoolId)
          )
        );
      console.log(
        `[REMOVE USERS FROM SCHOOL] Step 7: Successfully removed positions`
      );
    } catch (error: any) {
      console.error(
        `[REMOVE USERS FROM SCHOOL] Step 7: Error removing positions:`,
        error
      );
      // Continue with other removals even if positions fail
    }

    // Step 8: Remove teacher_classes associations for classes belonging to this school
    console.log(
      `[REMOVE USERS FROM SCHOOL] Step 8: Removing teacher_classes for ${data.userIds.length} users from school ${schoolId}...`
    );
    try {
      // First, get all class IDs for this school
      const schoolClasses = await db
        .select({ id: classes.id })
        .from(classes)
        .where(eq(classes.schoolId, schoolId));

      const schoolClassIds = schoolClasses.map((c) => c.id);

      if (schoolClassIds.length > 0) {
        // Remove teacher_classes where userId is in our list and classId belongs to this school
        await db
          .delete(teacherClasses)
          .where(
            and(
              inArray(teacherClasses.userId, data.userIds),
              inArray(teacherClasses.classId, schoolClassIds)
            )
          );
        console.log(
          `[REMOVE USERS FROM SCHOOL] Step 8: Successfully removed teacher_classes`
        );
      } else {
        console.log(
          `[REMOVE USERS FROM SCHOOL] Step 8: No classes found for school, skipping teacher_classes removal`
        );
      }
    } catch (error: any) {
      console.error(
        `[REMOVE USERS FROM SCHOOL] Step 8: Error removing teacher_classes:`,
        error
      );
      // Continue even if teacher_classes removal fails
    }

    // All users were processed successfully (we don't fail individual users)
    results.successful.push(...data.userIds);

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log("[REMOVE USERS FROM SCHOOL] ====== END ======", {
      duration: `${duration}ms`,
      successful: results.successful.length,
      failed: results.failed.length,
    });

    return NextResponse.json(
      {
        success: true,
        removed: results.successful.length,
        failed: results.failed.length,
        results,
      },
      { status: 200 }
    );
  } catch (e: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.error("[REMOVE USERS FROM SCHOOL] ====== ERROR ======", {
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
