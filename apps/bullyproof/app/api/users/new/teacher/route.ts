/**
 * Teacher User Creation API route handler.
 *
 * Exposes HTTP endpoint for creating new teacher users.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin or school admin role for the specific school.
 *
 * Endpoints:
 * - POST /api/users/new/teacher - Create a new teacher user
 *
 * Responses:
 * - 201 Created: Returns the created user data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { getUserScopedRoles } from "@/server/auth/rbac";
import { checkFeatureAccess } from "@/server/features/features.service";
import { createServerAdminClient } from "@/utils/supabase/admin";
import {
  findAuthUserIdByEmail,
  getOrCreateAuthUserId,
} from "@/server/user/resolve-auth-user-by-email";
import { rolesRepo } from "@/server/roles/roles.repo";
import { db } from "@/server/db/drizzle";
import { userProfile } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Request body schema
const createTeacherSchema = z.object({
  schoolId: z.uuid(),
  email: z.email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

/**
 * Handle POST /api/users/new/teacher
 *
 * Creates a new teacher user.
 * Only platform admins or existing school admins for that specific school can create teachers.
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
    console.log("[TEACHER CREATE] Request received:", {
      userId,
      body: { ...body, email: body.email ? "***" : undefined },
    });

    // Validate request body
    const data = createTeacherSchema.parse(body);

    // Check permissions: admin_users (platform) OR teachers feature at this school + membership
    const hasAdminUsers = await checkFeatureAccess(userId, "/admin/users");
    const roles = await getUserScopedRoles(userId);
    const hasTeachersAtSchool =
      await checkFeatureAccess(userId, "/school/teachers", data.schoolId);
    const isMemberOfSchool = roles.school.some(
      (r) => r.schoolId === data.schoolId
    );
    const allowed =
      hasAdminUsers || (hasTeachersAtSchool && isMemberOfSchool);

    if (!allowed) {
      console.error(
        "[TEACHER CREATE] Unauthorized - insufficient permissions:",
        { userId, schoolId: data.schoolId }
      );
      return NextResponse.json(
        {
          error:
            "Unauthorized - Admin users or teachers access for this school required",
        },
        { status: 403 }
      );
    }

    const adminClient = await createServerAdminClient();

    console.log("[TEACHER CREATE] Checking for existing user:", data.email);
    const existingAuthUserId = await findAuthUserIdByEmail(
      adminClient.auth.admin,
      data.email
    );

    let newUserId: string;

    if (existingAuthUserId) {
      console.log(
        "[TEACHER CREATE] User already exists, userId:",
        existingAuthUserId
      );
      newUserId = existingAuthUserId;

      // Update user_profile with firstName and lastName if provided
      if (data.firstName || data.lastName) {
        const updateData: {
          firstName?: string;
          lastName?: string;
        } = {};
        if (data.firstName) updateData.firstName = data.firstName;
        if (data.lastName) updateData.lastName = data.lastName;

        // Retry logic: up to 2 retries (3 total attempts)
        let updateError: any = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          attempts++;
          console.log(
            `[TEACHER CREATE] Updating existing user_profile (attempt ${attempts}/${maxAttempts})`
          );

          try {
            await db
              .update(userProfile)
              .set(updateData)
              .where(eq(userProfile.id, newUserId));

            console.log(
              "[TEACHER CREATE] Existing user profile updated successfully"
            );
            updateError = null;
            break;
          } catch (error: any) {
            updateError = error;
            console.error(
              `[TEACHER CREATE] Failed to update existing user_profile (attempt ${attempts}/${maxAttempts}):`,
              {
                error: updateError,
                message: updateError?.message,
                stack: updateError?.stack,
                userId: newUserId,
              }
            );

            // Wait before retrying (exponential backoff)
            if (attempts < maxAttempts) {
              const delay = Math.min(200 * attempts, 1000); // 200ms, 400ms, 600ms...
              console.log(`[TEACHER CREATE] Retrying in ${delay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        }

        if (updateError) {
          console.error(
            "[TEACHER CREATE] Failed to update existing user_profile after all retries:",
            {
              error: updateError,
              attempts,
              userId: newUserId,
            }
          );
          throw new Error(
            `Failed to update user profile after ${maxAttempts} attempts: ${updateError?.message || "Unknown error"}`
          );
        }
      }
    } else {
      // Create new user in auth.users
      console.log("[TEACHER CREATE] Creating new user in auth.users");
      newUserId = await getOrCreateAuthUserId(
        adminClient.auth.admin,
        data.email
      );
      console.log(
        "[TEACHER CREATE] User created successfully, userId:",
        newUserId
      );

      // Wait for trigger to create user_profile
      console.log(
        "[TEACHER CREATE] Waiting for trigger to create user_profile..."
      );
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Update user_profile with firstName and lastName if provided
      if (data.firstName || data.lastName) {
        const updateData: {
          firstName?: string;
          lastName?: string;
        } = {};
        if (data.firstName) updateData.firstName = data.firstName;
        if (data.lastName) updateData.lastName = data.lastName;

        // Retry logic: up to 2 retries (3 total attempts)
        let updateError: any = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          attempts++;
          console.log(
            `[TEACHER CREATE] Updating user_profile (attempt ${attempts}/${maxAttempts})`
          );

          try {
            await db
              .update(userProfile)
              .set(updateData)
              .where(eq(userProfile.id, newUserId));

            console.log("[TEACHER CREATE] User profile updated successfully");
            updateError = null;
            break;
          } catch (error: any) {
            updateError = error;
            console.error(
              `[TEACHER CREATE] Failed to update user_profile (attempt ${attempts}/${maxAttempts}):`,
              {
                error: updateError,
                message: updateError?.message,
                stack: updateError?.stack,
                userId: newUserId,
              }
            );

            // Wait before retrying (exponential backoff)
            if (attempts < maxAttempts) {
              const delay = Math.min(200 * attempts, 1000); // 200ms, 400ms, 600ms...
              console.log(`[TEACHER CREATE] Retrying in ${delay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        }

        if (updateError) {
          console.error(
            "[TEACHER CREATE] Failed to update user_profile after all retries:",
            {
              error: updateError,
              attempts,
              userId: newUserId,
            }
          );
          throw new Error(
            `Failed to update user profile after ${maxAttempts} attempts: ${updateError?.message || "Unknown error"}`
          );
        }
      }
    }

    // Get TEACHER role
    console.log("[TEACHER CREATE] Getting TEACHER role");
    const teacherRole = await rolesRepo.getByKey("TEACHER");
    if (!teacherRole[0]) {
      console.error("[TEACHER CREATE] TEACHER role not found");
      throw new Error("TEACHER role not found");
    }

    // Check if user already has this role for this school
    const existingRole = await rolesRepo.hasRole(
      newUserId,
      teacherRole[0].id,
      data.schoolId
    );

    // Assign role if not already assigned
    if (existingRole.length === 0) {
      console.log("[TEACHER CREATE] Assigning TEACHER role to user");
      await rolesRepo.assignRole({
        userId: newUserId,
        roleId: teacherRole[0].id,
        schoolId: data.schoolId,
        roleScope: "school",
      });
      console.log("[TEACHER CREATE] Role assigned successfully");
    } else {
      console.log(
        "[TEACHER CREATE] User already has TEACHER role for this school"
      );
    }

    console.log("[TEACHER CREATE] Teacher created successfully:", {
      userId: newUserId,
      schoolId: data.schoolId,
    });

    return NextResponse.json(
      {
        userId: newUserId,
        email: data.email,
        schoolId: data.schoolId,
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("[TEACHER CREATE] Error:", {
      error: e,
      message: e?.message,
      name: e?.name,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      constraint: e?.constraint,
      table: e?.table,
      column: e?.column,
    });

    // Handle validation errors
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: e.issues },
        { status: 400 }
      );
    }

    const status = e.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
