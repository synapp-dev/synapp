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
import { checkFeatureAccess } from "@/server/features/features.service";
import { createServerAdminClient } from "@/utils/supabase/admin";
import { rolesRepo } from "@/server/roles/roles.repo";
import { db } from "@/server/db/drizzle";
import { userProfile, userRoles } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

// Request body schema
const createPlatformAdminSchema = z.object({
  email: z.email(),
  roleScope: z.enum(["platform", "school"]),
  roleName: z.string().min(1),
  schoolId: z.uuid().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

/**
 * Handle POST /api/users/new/platform-admin
 *
 * Creates a new platform admin user.
 * Only platform admins can create platform admins.
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

    // Check permissions: must have admin_users feature
    const hasAdminUsers = await checkFeatureAccess(userId, "/admin/users");
    if (!hasAdminUsers) {
      console.error(
        "[PLATFORM ADMIN CREATE] Unauthorized - insufficient permissions:",
        { userId }
      );
      return NextResponse.json(
        { error: "Unauthorized - Admin users permission required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log("[PLATFORM ADMIN CREATE] Request received:", {
      userId,
      body: { ...body, email: body.email ? "***" : undefined },
    });

    // Validate request body
    const data = createPlatformAdminSchema.parse(body);

    // Ensure roleScope is platform for platform admin
    if (data.roleScope !== "platform") {
      return NextResponse.json(
        { error: "Platform admin must have platform scope" },
        { status: 400 }
      );
    }

    const adminClient = await createServerAdminClient();

    // Check if user already exists
    console.log(
      "[PLATFORM ADMIN CREATE] Checking for existing user:",
      data.email
    );
    const { data: existingUsers, error: listUsersError } =
      await adminClient.auth.admin.listUsers();

    if (listUsersError) {
      console.error(
        "[PLATFORM ADMIN CREATE] Database error - Failed to list users:",
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
        "[PLATFORM ADMIN CREATE] User already exists, userId:",
        existingUser.id
      );
      newUserId = existingUser.id;

      // Wait a bit for profile to be ready
      await new Promise((resolve) => setTimeout(resolve, 500));
    } else {
      // Create new user in auth.users
      console.log("[PLATFORM ADMIN CREATE] Creating new user in auth.users");
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email: data.email,
          email_confirm: true,
        });

      if (createError) {
        console.error(
          "[PLATFORM ADMIN CREATE] Database error - Failed to create user:",
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
          "[PLATFORM ADMIN CREATE] Database error - No user returned:",
          {
            newUser,
            email: data.email,
          }
        );
        throw new Error("Failed to create user: No user returned");
      }

      newUserId = newUser.user.id;
      console.log(
        "[PLATFORM ADMIN CREATE] User created successfully, userId:",
        newUserId
      );

      // Wait for trigger to create user_profile
      console.log(
        "[PLATFORM ADMIN CREATE] Waiting for trigger to create user_profile..."
      );
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify user_profile was created, and create it manually if trigger failed
      // Use Drizzle to bypass RLS policies
      let profileExists = false;
      const maxAttempts = 5;
      let attempts = 0;

      while (attempts < maxAttempts && !profileExists) {
        attempts++;
        try {
          const existingProfile = await db
            .select()
            .from(userProfile)
            .where(eq(userProfile.id, newUserId))
            .limit(1);

          if (existingProfile.length > 0) {
            profileExists = true;
            console.log(
              "[PLATFORM ADMIN CREATE] User profile verified successfully"
            );
            break;
          }

          // Profile doesn't exist, try to create it using Drizzle (bypasses RLS)
          console.log(
            `[PLATFORM ADMIN CREATE] Creating user_profile manually (attempt ${attempts}/${maxAttempts})`
          );
          await db.insert(userProfile).values({
            id: newUserId,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
          });

          profileExists = true;
          console.log(
            "[PLATFORM ADMIN CREATE] User profile created successfully"
          );
        } catch (error: any) {
          if (error.code === "23505") {
            // Unique constraint violation - profile was created by trigger between attempts
            console.log(
              "[PLATFORM ADMIN CREATE] Profile already exists (created by trigger)"
            );
            profileExists = true;
            break;
          }

          console.error(
            `[PLATFORM ADMIN CREATE] Failed to create/verify user_profile (attempt ${attempts}/${maxAttempts}):`,
            {
              error: error.message,
              code: error.code,
              userId: newUserId,
            }
          );

          if (attempts < maxAttempts) {
            // Wait before retrying (exponential backoff)
            const delay = Math.min(200 * attempts, 1000);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            throw new Error(
              `Failed to create user profile after ${maxAttempts} attempts: ${error.message}`
            );
          }
        }
      }
    }

    // Update user_profile with firstName and lastName if provided
    if (data.firstName || data.lastName) {
      const updateData: {
        firstName?: string;
        lastName?: string;
      } = {};
      if (data.firstName) updateData.firstName = data.firstName;
      if (data.lastName) updateData.lastName = data.lastName;

      try {
        await db
          .update(userProfile)
          .set(updateData)
          .where(eq(userProfile.id, newUserId));
        console.log(
          "[PLATFORM ADMIN CREATE] User profile updated with firstName/lastName"
        );
      } catch (updateError: any) {
        console.error(
          "[PLATFORM ADMIN CREATE] Failed to update user profile:",
          updateError
        );
        // Non-fatal error, continue
      }
    }

    // Check if user has SCHOOL_LICENCE role (which conflicts with other roles)
    const schoolLicenceRole = await rolesRepo.getByKey("SCHOOL_LICENCE");
    if (schoolLicenceRole[0]) {
      const hasSchoolLicence = await db
        .select()
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, newUserId),
            eq(userRoles.roleId, schoolLicenceRole[0].id)
          )
        )
        .limit(1);

      if (hasSchoolLicence.length > 0) {
        console.error(
          "[PLATFORM ADMIN CREATE] User has SCHOOL_LICENCE role which conflicts with PLATFORM_ADMIN"
        );
        return NextResponse.json(
          {
            error:
              "User with SCHOOL_LICENCE role cannot have any other roles. Please remove SCHOOL_LICENCE role first.",
          },
          { status: 400 }
        );
      }
    }

    // Get PLATFORM_ADMIN role
    console.log("[PLATFORM ADMIN CREATE] Getting PLATFORM_ADMIN role");
    const platformAdminRole = await rolesRepo.getByKey("PLATFORM_ADMIN");
    if (!platformAdminRole[0]) {
      console.error("[PLATFORM ADMIN CREATE] PLATFORM_ADMIN role not found");
      throw new Error("PLATFORM_ADMIN role not found");
    }

    // Check if user already has this platform role (platform roles have NULL schoolId)
    const existingRole = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, newUserId),
          eq(userRoles.roleId, platformAdminRole[0].id),
          isNull(userRoles.schoolId)
        )
      )
      .limit(1);

    // Assign role if not already assigned
    if (existingRole.length === 0) {
      console.log(
        "[PLATFORM ADMIN CREATE] Assigning PLATFORM_ADMIN role to user"
      );
      await rolesRepo.assignRole({
        userId: newUserId,
        roleId: platformAdminRole[0].id,
        schoolId: undefined,
        roleScope: "platform",
      });
      console.log("[PLATFORM ADMIN CREATE] Role assigned successfully");
    } else {
      console.log(
        "[PLATFORM ADMIN CREATE] User already has PLATFORM_ADMIN role"
      );
    }

    console.log(
      "[PLATFORM ADMIN CREATE] Platform admin created successfully:",
      {
        userId: newUserId,
        email: data.email,
      }
    );

    return NextResponse.json(
      {
        userId: newUserId,
        email: data.email,
        roleName: data.roleName,
        roleScope: data.roleScope,
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("[PLATFORM ADMIN CREATE] Error:", {
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

    // Handle specific database constraint errors
    if (
      e.message?.includes("SCHOOL_LICENCE") ||
      e.message?.includes("cannot have any other roles")
    ) {
      return NextResponse.json(
        {
          error:
            "User with SCHOOL_LICENCE role cannot have any other roles. Please remove SCHOOL_LICENCE role first.",
        },
        { status: 400 }
      );
    }

    const status =
      e.message?.includes("Unauthorized") ||
      e.message?.includes("Platform admin role required")
        ? 403
        : e.message?.includes("not found") || e.message?.includes("required")
          ? 400
          : 500;

    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
