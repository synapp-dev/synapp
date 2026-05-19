/**
 * Generic User Creation API route handler.
 *
 * Exposes HTTP endpoint for creating new users with any role.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin role for creating users.
 *
 * Endpoints:
 * - POST /api/users/new - Create a new user with a role
 *
 * Responses:
 * - 201 Created: Returns the created user data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { checkFeatureAccess } from "@/server/features/features.service";
import { getUserScopedRoles } from "@/server/auth/rbac";
import { createServerAdminClient } from "@/utils/supabase/admin";
import {
  findAuthUserIdByEmail,
  getOrCreateAuthUserId,
} from "@/server/user/resolve-auth-user-by-email";
import { rolesRepo } from "@/server/roles/roles.repo";
import { db } from "@/server/db/drizzle";
import { userProfile, scopes, roles } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

type UpdateLog = {
  type?: "creation" | "update";
  updatedAt: string;
  updatedBy: string;
  changes?: Array<{
    field: string;
    oldValue: string | null;
    newValue: string | null;
  }>;
};

type UserMetadata = {
  updateLogs?: UpdateLog[];
  roleLogs?: unknown[];
  [key: string]: unknown;
};

// Request body schema
const createUserSchema = z.object({
  email: z.email(),
  roleScope: z.enum(["platform", "school"]),
  schoolId: z.uuid().optional(),
  roleName: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

/**
 * Handle POST /api/users/new
 *
 * Creates a new user and assigns them a role.
 * Only platform admins can create users.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the created user or an error payload.
 */
export async function POST(request: Request) {
  try {
    // Use createServerClient to get authenticated user with proper headers
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      console.error("[USER CREATE] Authentication error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    const body = await request.json();
    console.log("[USER CREATE] Request received:", {
      userId,
      body: { ...body, email: body.email ? "***" : undefined },
    });

    // Validate request body
    const data = createUserSchema.parse(body);

    // Validate schoolId is provided for school scope
    if (data.roleScope === "school" && !data.schoolId) {
      return NextResponse.json(
        { error: "schoolId is required for school-scoped roles" },
        { status: 400 }
      );
    }

    const hasAdminUsers = await checkFeatureAccess(userId, "/admin/users");

    // SCHOOL_ADMIN: allow when roleScope is school, schoolId matches their school, and roleName is school role
    const allowedSchoolRoleNames = ["SCHOOL_STAFF", "TEACHER", "SCHOOL_ADMIN"];
    const isSchoolScopeWithSchoolRole =
      data.roleScope === "school" &&
      data.schoolId &&
      allowedSchoolRoleNames.includes(data.roleName);

    if (!hasAdminUsers) {
      if (isSchoolScopeWithSchoolRole) {
        const roles = await getUserScopedRoles(userId);
        const isSchoolAdminAtSchool = roles.school.some(
          (r) => r.schoolId === data.schoolId && r.roleKey === "SCHOOL_ADMIN"
        );
        const hasSchoolManageRoles = await checkFeatureAccess(
          userId,
          "school:manage-school-user-roles",
          data.schoolId ?? undefined
        );
        if (!isSchoolAdminAtSchool || !hasSchoolManageRoles) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
      } else {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }
    }

    // Get scope ID from scope name
    const scopeResult = await db
      .select()
      .from(scopes)
      .where(eq(scopes.name, data.roleScope))
      .limit(1);

    if (scopeResult.length === 0) {
      return NextResponse.json(
        { error: `Scope '${data.roleScope}' not found` },
        { status: 400 }
      );
    }

    const scopeId = scopeResult[0].id;

    // Find role by key (client sends role key like "SCHOOL_STAFF", "TEACHER", etc.)
    const roleResult = await db
      .select()
      .from(roles)
      .where(and(eq(roles.key, data.roleName), eq(roles.scopeId, scopeId)))
      .limit(1);

    if (roleResult.length === 0) {
      return NextResponse.json(
        {
          error: `Role '${data.roleName}' not found for scope '${data.roleScope}'`,
        },
        { status: 400 }
      );
    }

    const role = roleResult[0];

    const adminClient = await createServerAdminClient();

    console.log("[USER CREATE] Checking for existing user:", data.email);
    const existingAuthUserId = await findAuthUserIdByEmail(
      adminClient.auth.admin,
      data.email
    );

    let newUserId: string;

    if (existingAuthUserId) {
      console.log(
        "[USER CREATE] User already exists, userId:",
        existingAuthUserId
      );
      newUserId = existingAuthUserId;

      // Wait a bit for profile to be ready
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get current profile using Drizzle
      const currentProfileResult = await db
        .select()
        .from(userProfile)
        .where(eq(userProfile.id, newUserId))
        .limit(1);

      if (currentProfileResult.length > 0) {
        const currentProfile = currentProfileResult[0];
        const currentMetadata = (currentProfile.metadata as UserMetadata | null) || ({} as UserMetadata);
        const updateLogs = Array.isArray(currentMetadata.updateLogs)
          ? currentMetadata.updateLogs
          : [];

        // Add creation log if it doesn't already exist
        const hasCreationLog = updateLogs.some(
          (log: any) => log.type === "creation"
        );
        if (!hasCreationLog) {
          updateLogs.push({
            type: "creation",
            updatedAt: new Date().toISOString(),
            updatedBy: userId,
          });
        }

        // Update user_profile with firstName, lastName, and metadata using Drizzle
        const updateData: {
          firstName?: string;
          lastName?: string;
          metadata?: any;
        } = {};
        if (data.firstName) updateData.firstName = data.firstName;
        if (data.lastName) updateData.lastName = data.lastName;
        updateData.metadata = {
          ...currentMetadata,
          updateLogs,
        };

        try {
          await db
            .update(userProfile)
            .set(updateData)
            .where(eq(userProfile.id, newUserId));

          console.log(
            "[USER CREATE] User profile updated with firstName/lastName and creation log"
          );
        } catch (updateErr: any) {
          console.error(
            "[USER CREATE] Error updating user profile:",
            updateErr
          );
          // Non-fatal error, continue
        }
      }
    } else {
      console.log("[USER CREATE] Creating new user in auth.users");
      newUserId = await getOrCreateAuthUserId(adminClient.auth.admin, data.email);
      console.log(
        "[USER CREATE] User created successfully, userId:",
        newUserId
      );

      // Wait for trigger to create user_profile
      console.log(
        "[USER CREATE] Waiting for trigger to create user_profile..."
      );
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify user_profile was created using Drizzle
      const profileResult = await db
        .select()
        .from(userProfile)
        .where(eq(userProfile.id, newUserId))
        .limit(1);

      // If profile doesn't exist, create it using Drizzle
      if (profileResult.length === 0) {
        console.log("[USER CREATE] Creating user_profile using Drizzle");
        try {
          await db.insert(userProfile).values({
            id: newUserId,
            email: data.email,
            firstName: data.firstName !== undefined ? (data.firstName || null) : null,
            lastName: data.lastName !== undefined ? (data.lastName || null) : null,
            metadata: {
              updateLogs: [
                {
                  type: "creation",
                  updatedAt: new Date().toISOString(),
                  updatedBy: userId,
                },
              ],
            },
          });
          console.log("[USER CREATE] User profile created successfully using Drizzle");
        } catch (insertError: any) {
          // Check if it's a unique constraint violation (profile was created by trigger)
          if (insertError.code === "23505") {
            console.log(
              "[USER CREATE] Profile already exists (created by trigger)"
            );
            // Profile was created by trigger, just update metadata with creation log
            const currentProfileResult = await db
              .select()
              .from(userProfile)
              .where(eq(userProfile.id, newUserId))
              .limit(1);

            if (currentProfileResult.length > 0) {
              const currentProfile = currentProfileResult[0];
              const currentMetadata = (currentProfile.metadata as UserMetadata | null) || ({} as UserMetadata);
              const updateLogs = Array.isArray(currentMetadata.updateLogs)
                ? currentMetadata.updateLogs
                : [];

              const hasCreationLog = updateLogs.some(
                (log: any) => log.type === "creation"
              );
              if (!hasCreationLog) {
                updateLogs.push({
                  type: "creation",
                  updatedAt: new Date().toISOString(),
                  updatedBy: userId,
                });
              }
              
              // Update firstName, lastName, and metadata
              const updateData: {
                firstName?: string | null;
                lastName?: string | null;
                metadata?: any;
              } = {};
              if (data.firstName !== undefined) updateData.firstName = data.firstName || null;
              if (data.lastName !== undefined) updateData.lastName = data.lastName || null;
              updateData.metadata = {
                ...currentMetadata,
                updateLogs,
              };
              
              await db
                .update(userProfile)
                .set(updateData)
                .where(eq(userProfile.id, newUserId));
            }
          } else {
            console.error(
              "[USER CREATE] Failed to create user_profile:",
              insertError
            );
            throw new Error(
              `Failed to create user profile: ${insertError.message}`
            );
          }
        }
      } else {
        // Profile exists, update firstName, lastName, and ensure creation log is present using Drizzle
        const currentProfile = profileResult[0];
        const currentMetadata = (currentProfile.metadata as UserMetadata | null) || ({} as UserMetadata);
        const updateLogs = Array.isArray(currentMetadata.updateLogs)
          ? currentMetadata.updateLogs
          : [];

        const hasCreationLog = updateLogs.some(
          (log: any) => log.type === "creation"
        );
        if (!hasCreationLog) {
          updateLogs.push({
            type: "creation",
            updatedAt: new Date().toISOString(),
            updatedBy: userId,
          });
        }
        
        // Update firstName, lastName, and metadata
        const updateData: {
          firstName?: string | null;
          lastName?: string | null;
          metadata?: any;
        } = {};
        if (data.firstName !== undefined) updateData.firstName = data.firstName || null;
        if (data.lastName !== undefined) updateData.lastName = data.lastName || null;
        updateData.metadata = {
          ...currentMetadata,
          updateLogs,
        };
        
        await db
          .update(userProfile)
          .set(updateData)
          .where(eq(userProfile.id, newUserId));
      }
    }

    // Check if user already has this role for this school (if applicable)
    const existingRoleCheck = await rolesRepo.hasRole(
      newUserId,
      role.id,
      data.schoolId || ""
    );

    // Assign role if not already assigned (rolesRepo uses Drizzle internally)
    if (existingRoleCheck.length === 0) {
      console.log("[USER CREATE] Assigning role to user");
      await rolesRepo.assignRole({
        userId: newUserId,
        roleId: role.id,
        schoolId: data.schoolId,
        roleScope: data.roleScope,
      });
      console.log("[USER CREATE] Role assigned successfully");
    } else {
      console.log("[USER CREATE] User already has this role for this school");
    }

    console.log("[USER CREATE] User created successfully:", {
      userId: newUserId,
      email: data.email,
      roleName: data.roleName,
      roleScope: data.roleScope,
      schoolId: data.schoolId,
    });

    return NextResponse.json(
      {
        userId: newUserId,
        email: data.email,
        roleName: data.roleName,
        roleScope: data.roleScope,
        schoolId: data.schoolId,
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("[USER CREATE] Error:", {
      error: e,
      message: e?.message,
      name: e?.name,
      stack: e?.stack,
    });

    // Handle Zod validation errors
    if (e.name === "ZodError") {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: (e as z.ZodError).issues,
        },
        { status: 400 }
      );
    }

    const status =
      e.message?.includes("Unauthorized") ||
      e.message?.includes("Unauthorized")
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
