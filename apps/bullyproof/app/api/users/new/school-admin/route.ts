/**
 * School Admin User Creation API route handler.
 *
 * Exposes HTTP endpoint for creating new school admin users.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin or school admin role for the specific school.
 *
 * Endpoints:
 * - POST /api/users/new/school-admin - Create a new school admin user
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
import { rolesRepo } from "@/server/roles/roles.repo";
import { db } from "@/server/db/drizzle";
import { userProfile } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Request body schema
const createSchoolAdminSchema = z.object({
  schoolId: z.uuid(),
  email: z.email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

/**
 * Handle POST /api/users/new/school-admin
 *
 * Creates a new school admin user.
 * Only platform admins or existing school admins for that specific school can create school admins.
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
    console.log("[SCHOOL ADMIN CREATE] Request received:", {
      userId,
      body: { ...body, email: body.email ? "***" : undefined },
    });

    // Validate request body
    const data = createSchoolAdminSchema.parse(body);

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
        "[SCHOOL ADMIN CREATE] Unauthorized - insufficient permissions:",
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

    // Check if user already exists
    console.log(
      "[SCHOOL ADMIN CREATE] Checking for existing user:",
      data.email
    );
    const { data: existingUsers, error: listUsersError } =
      await adminClient.auth.admin.listUsers();

    if (listUsersError) {
      console.error(
        "[SCHOOL ADMIN CREATE] Database error - Failed to list users:",
        {
          error: listUsersError,
          message: listUsersError.message,
          status: listUsersError.status,
        }
      );
      throw new Error(
        `Failed to check existing users: ${listUsersError.message}`
      );
    }

    const existingUser = existingUsers?.users?.find(
      (u: { email?: string }) =>
        u.email?.toLowerCase() === data.email.toLowerCase()
    );

    let newUserId: string;

    if (existingUser) {
      console.log(
        "[SCHOOL ADMIN CREATE] User already exists, userId:",
        existingUser.id
      );
      newUserId = existingUser.id;

      // Update user_profile with firstName and lastName if provided
      if (data.firstName || data.lastName) {
        const updateData: Record<string, string> = {};
        if (data.firstName) updateData.first_name = data.firstName;
        if (data.lastName) updateData.last_name = data.lastName;

        // Retry logic: up to 2 retries (3 total attempts)
        let updateError: any = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          attempts++;
          console.log(
            `[SCHOOL ADMIN CREATE] Updating existing user_profile (attempt ${attempts}/${maxAttempts})`
          );

          const { error: updateErrorResult } = await adminClient
            .from("user_profile")
            .update(updateData)
            .eq("id", newUserId);

          if (!updateErrorResult) {
            console.log(
              "[SCHOOL ADMIN CREATE] Existing user profile updated successfully"
            );
            updateError = null;
            break;
          }

          updateError = updateErrorResult;
          console.error(
            `[SCHOOL ADMIN CREATE] Failed to update existing user_profile (attempt ${attempts}/${maxAttempts}):`,
            {
              error: updateError,
              code: updateError.code,
              message: updateError.message,
              userId: newUserId,
            }
          );

          // Wait before retrying (exponential backoff)
          if (attempts < maxAttempts) {
            const delay = Math.min(200 * attempts, 1000); // 200ms, 400ms, 600ms...
            console.log(`[SCHOOL ADMIN CREATE] Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }

        if (updateError) {
          console.error(
            "[SCHOOL ADMIN CREATE] Failed to update existing user_profile after all retries:",
            {
              error: updateError,
              attempts,
              userId: newUserId,
            }
          );
          throw new Error(
            `Failed to update user profile after ${maxAttempts} attempts: ${updateError.message}`
          );
        }
      }
    } else {
      // Create new user in auth.users
      console.log("[SCHOOL ADMIN CREATE] Creating new user in auth.users");
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email: data.email,
          email_confirm: true,
        });

      if (createError) {
        console.error(
          "[SCHOOL ADMIN CREATE] Database error - Failed to create user:",
          {
            error: createError,
            message: createError.message,
            status: createError.status,
            email: data.email,
          }
        );
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      if (!newUser.user) {
        console.error(
          "[SCHOOL ADMIN CREATE] Database error - No user returned:",
          {
            newUser,
            email: data.email,
          }
        );
        throw new Error("Failed to create user: No user returned");
      }

      newUserId = newUser.user.id;
      console.log(
        "[SCHOOL ADMIN CREATE] User created successfully, userId:",
        newUserId
      );

      // Wait for trigger to create user_profile
      console.log(
        "[SCHOOL ADMIN CREATE] Waiting for trigger to create user_profile..."
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
            `[SCHOOL ADMIN CREATE] Updating user_profile (attempt ${attempts}/${maxAttempts})`
          );

          try {
            await db
              .update(userProfile)
              .set(updateData)
              .where(eq(userProfile.id, newUserId));

            console.log(
              "[SCHOOL ADMIN CREATE] User profile updated successfully"
            );
            updateError = null;
            break;
          } catch (error: any) {
            updateError = error;
            console.error(
              `[SCHOOL ADMIN CREATE] Failed to update user_profile (attempt ${attempts}/${maxAttempts}):`,
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
              console.log(`[SCHOOL ADMIN CREATE] Retrying in ${delay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        }

        if (updateError) {
          console.error(
            "[SCHOOL ADMIN CREATE] Failed to update user_profile after all retries:",
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

    // Get SCHOOL_ADMIN role
    console.log("[SCHOOL ADMIN CREATE] Getting SCHOOL_ADMIN role");
    const schoolAdminRole = await rolesRepo.getByKey("SCHOOL_ADMIN");
    if (!schoolAdminRole[0]) {
      console.error("[SCHOOL ADMIN CREATE] SCHOOL_ADMIN role not found");
      throw new Error("SCHOOL_ADMIN role not found");
    }

    // Check if user already has this role for this school
    const existingRole = await rolesRepo.hasRole(
      newUserId,
      schoolAdminRole[0].id,
      data.schoolId
    );

    // Assign role if not already assigned
    if (existingRole.length === 0) {
      console.log("[SCHOOL ADMIN CREATE] Assigning SCHOOL_ADMIN role to user");
      await rolesRepo.assignRole({
        userId: newUserId,
        roleId: schoolAdminRole[0].id,
        schoolId: data.schoolId,
        roleScope: "school",
      });
      console.log("[SCHOOL ADMIN CREATE] Role assigned successfully");
    } else {
      console.log(
        "[SCHOOL ADMIN CREATE] User already has SCHOOL_ADMIN role for this school"
      );
    }

    console.log("[SCHOOL ADMIN CREATE] School admin created successfully:", {
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
    console.error("[SCHOOL ADMIN CREATE] Error:", {
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
