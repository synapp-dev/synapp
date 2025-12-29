import {
  listUsersSchema,
  createUserWithMagicLinkSchema,
  type ListUsersParams,
  type CreateUserWithMagicLinkParams,
} from "./user.validators";
import { userRepo } from "./user.repo";
import { getUserScopedRoles } from "@/server/auth/rbac";
import { createServerAdminClient } from "@/utils/supabase/admin";
import { schoolRepo } from "@/server/school/school.repo";

// Helper to check if a string is a valid UUID
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanListAllUsers(
  ctx: AuthContext,
  schoolId?: string
) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  const roles = await getUserScopedRoles(ctx.userId);

  // Platform admins can list all users
  if (roles.platform.includes("PLATFORM_ADMIN")) {
    return;
  }

  // If a schoolId is provided, check if user has any role at that school
  if (schoolId) {
    const hasAccessToSchool = roles.school.some(
      (role) =>
        role.schoolId?.toLowerCase().trim() === schoolId.toLowerCase().trim()
    );

    if (hasAccessToSchool) {
      return;
    }

    throw new Error("Unauthorized to list users for this school");
  }

  // If no schoolId is provided, only platform admins can list all users
  throw new Error("Unauthorized to list all users");
}

async function assertCanCreateUsers(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  const roles = await getUserScopedRoles(ctx.userId);

  // Only platform admins can create users
  if (roles.platform.includes("PLATFORM_ADMIN")) {
    return;
  }

  throw new Error("Unauthorized to create users");
}

export const userService = {
  async listAllUsers(ctx: AuthContext, query: unknown) {
    const params: ListUsersParams = listUsersSchema.parse(query);
    
    // Resolve schoolId if it's a slug (for permission check)
    let resolvedSchoolId: string | undefined = params.schoolId;
    if (params.schoolId && !isValidUUID(params.schoolId)) {
      // It's a slug, resolve it to UUID for permission check
      const schoolResults = await schoolRepo.getBySlug(params.schoolId);
      if (schoolResults.length > 0) {
        resolvedSchoolId = schoolResults[0].id;
      } else {
        throw new Error("School not found");
      }
    }
    
    await assertCanListAllUsers(ctx, resolvedSchoolId);

    return await userRepo.getAllUsersWithRolesAndSchools(params);
  },

  async createUserWithMagicLink(
    ctx: AuthContext,
    params: unknown
  ): Promise<{ userId: string; email: string }> {
    await assertCanCreateUsers(ctx);
    const data: CreateUserWithMagicLinkParams =
      createUserWithMagicLinkSchema.parse(params);

    const adminClient = await createServerAdminClient();

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: { email?: string }) => u.email === data.email
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      // User already exists - no need to send magic link, they can log in normally
      // Just return the userId so the role can be assigned
    } else {
      // Create new user and send invite email
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email: data.email,
          email_confirm: true, // Auto-confirm email
        });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      if (!newUser.user) {
        throw new Error("Failed to create user: No user returned");
      }

      userId = newUser.user.id;

      // Send magic link invite email
      const { error: inviteError } =
        await adminClient.auth.admin.inviteUserByEmail(data.email, {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/callback`,
        });

      if (inviteError) {
        // Log but don't fail - user is created, they can request a new link
        console.error(
          `Failed to send magic link email: ${inviteError.message}`
        );
      }
    }

    // Note: user_profile should be created automatically by database trigger
    // But we verify it exists or create it if needed
    const { data: profile, error: profileError } = await adminClient
      .from("user_profile")
      .select("id")
      .eq("id", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      // PGRST116 is "not found" - trigger should create it, but if it doesn't exist, create it
      const { error: insertError } = await adminClient
        .from("user_profile")
        .insert({
          id: userId,
          email: data.email,
        });

      if (insertError) {
        console.error("Failed to create user_profile:", insertError);
        // Don't throw - the trigger should handle this, but log the error
      }
    }

    return {
      userId,
      email: data.email,
    };
  },
};

