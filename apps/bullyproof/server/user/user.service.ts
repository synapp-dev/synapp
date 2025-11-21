import {
  listUsersSchema,
  createUserWithMagicLinkSchema,
  type ListUsersParams,
  type CreateUserWithMagicLinkParams,
} from "./user.validators";
import { userRepo } from "./user.repo";
import { getUserScopedRoles } from "@/server/auth/rbac";
import { createServerAdminClient } from "@/utils/supabase/admin";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanListAllUsers(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  const roles = await getUserScopedRoles(ctx.userId);

  // Only platform admins can list all users
  if (
    roles.platform.includes("BULLYPROOF_ADMIN") ||
    roles.platform.includes("PLATFORM_ADMIN")
  ) {
    return;
  }

  throw new Error("Unauthorized to list all users");
}

async function assertCanCreateUsers(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  const roles = await getUserScopedRoles(ctx.userId);

  // Only platform admins can create users
  if (
    roles.platform.includes("BULLYPROOF_ADMIN") ||
    roles.platform.includes("PLATFORM_ADMIN")
  ) {
    return;
  }

  throw new Error("Unauthorized to create users");
}

export const userService = {
  async listAllUsers(ctx: AuthContext, query: unknown) {
    const params: ListUsersParams = listUsersSchema.parse(query);
    await assertCanListAllUsers(ctx);

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
      // User exists, send them a magic link invite email
      const { error: inviteError } =
        await adminClient.auth.admin.inviteUserByEmail(data.email, {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/callback`,
        });

      if (inviteError) {
        throw new Error(`Failed to send magic link: ${inviteError.message}`);
      }
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
