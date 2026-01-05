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
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { getUserScopedRoles } from "@/server/auth/rbac";
import { createServerAdminClient } from "@/utils/supabase/admin";
import { rolesRepo } from "@/server/roles/roles.repo";
import { db } from "@/server/db/drizzle";
import { userProfile, scopes, roles } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

// Request body schema
const createUserSchema = z.object({
  email: z.email(),
  roleScope: z.enum(["platform", "school"]),
  schoolId: z.uuid().optional(),
  roleName: z.string().min(1),
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
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Check permissions: must be platform admin
    const userRoles = await getUserScopedRoles(userId);
    const isPlatformAdmin = userRoles.platform.includes("PLATFORM_ADMIN");

    if (!isPlatformAdmin) {
      console.error(
        "[USER CREATE] Unauthorized - insufficient permissions:",
        {
          userId,
          platformRoles: userRoles.platform,
        }
      );
      return NextResponse.json(
        {
          error: "Unauthorized - Platform admin required",
        },
        { status: 403 }
      );
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

    // Find role by name within the scope
    const roleResult = await db
      .select()
      .from(roles)
      .where(and(eq(roles.name, data.roleName), eq(roles.scopeId, scopeId)))
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

    // Check if user already exists
    console.log("[USER CREATE] Checking for existing user:", data.email);
    const { data: existingUsers, error: listUsersError } =
      await adminClient.auth.admin.listUsers();

    if (listUsersError) {
      console.error(
        "[USER CREATE] Failed to list users:",
        listUsersError.message
      );
      throw new Error(`Failed to check existing users: ${listUsersError.message}`);
    }

    const existingUser = existingUsers?.users?.find(
      (u: { email?: string }) => u.email === data.email
    );

    let newUserId: string;

    if (existingUser) {
      console.log(
        "[USER CREATE] User already exists, userId:",
        existingUser.id
      );
      newUserId = existingUser.id;

      // Wait a bit for profile to be ready
      await new Promise((resolve) => setTimeout(resolve, 500));
    } else {
      // Create new user in auth.users
      console.log("[USER CREATE] Creating new user in auth.users");
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email: data.email,
          email_confirm: true,
        });

      if (createError) {
        console.error(
          "[USER CREATE] Database error - Failed to create user:",
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
          "[USER CREATE] Database error - No user returned:",
          {
            newUser,
            email: data.email,
          }
        );
        throw new Error("Failed to create user: No user returned");
      }

      newUserId = newUser.user.id;
      console.log(
        "[USER CREATE] User created successfully, userId:",
        newUserId
      );

      // Wait for trigger to create user_profile
      console.log(
        "[USER CREATE] Waiting for trigger to create user_profile..."
      );
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify user_profile was created
      const { data: profile, error: profileError } = await adminClient
        .from("user_profile")
        .select("id")
        .eq("id", newUserId)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        // PGRST116 is "not found" - we'll try to create it
        console.error(
          "[USER CREATE] Failed to verify user_profile:",
          profileError
        );
      }

      // If profile doesn't exist, create it
      if (!profile) {
        console.log("[USER CREATE] Creating user_profile manually");
        const maxAttempts = 5;
        let attempts = 0;
        let updateError: any = null;

        while (attempts < maxAttempts) {
          attempts++;
          const { error } = await adminClient.from("user_profile").insert({
            id: newUserId,
            email: data.email,
          });

          if (!error) {
            updateError = null;
            break;
          }

          updateError = error;

          if (error.code === "23505") {
            // Unique constraint violation - profile was created by trigger
            console.log(
              "[USER CREATE] Profile already exists (created by trigger)"
            );
            updateError = null;
            break;
          }

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 200 * attempts));
        }

        if (updateError) {
          console.error(
            "[USER CREATE] Failed to create user_profile after all retries:",
            {
              error: updateError,
              attempts,
              userId: newUserId,
            }
          );
          throw new Error(
            `Failed to create user profile after ${maxAttempts} attempts: ${updateError.message}`
          );
        }
      }
    }

    // Check if user already has this role for this school (if applicable)
    const existingRoleCheck = await rolesRepo.hasRole(
      newUserId,
      role.id,
      data.schoolId || ""
    );

    // Assign role if not already assigned
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
      console.log(
        "[USER CREATE] User already has this role for this school"
      );
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
          details: e.errors,
        },
        { status: 400 }
      );
    }

    const status =
      e.message?.includes("Unauthorized") ||
      e.message?.includes("PLATFORM_ADMIN")
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
