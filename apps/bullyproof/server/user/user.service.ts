import {
  listUsersSchema,
  createUserWithMagicLinkSchema,
  type ListUsersParams,
  type CreateUserWithMagicLinkParams,
} from "./user.validators";
import { userRepo } from "./user.repo";
import { getUserScopedRoles } from "@/server/auth/rbac";
import { checkFeatureAccess, assertFeature } from "@/server/features/features.service";
import { createServerAdminClient } from "@/utils/supabase/admin";
import { schoolRepo } from "@/server/school/school.repo";
import { db } from "@/server/db/drizzle";
import { userSessions } from "@/drizzle/schema";
import { sql, desc, inArray } from "drizzle-orm";

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

async function assertCanListAllUsers(ctx: AuthContext, schoolId?: string) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }
  const hasAdminUsers = await checkFeatureAccess(ctx.userId, "/admin/users");
  if (hasAdminUsers) return;
  if (schoolId) {
    const roles = await getUserScopedRoles(ctx.userId);
    if (roles.school.some((role) => role.schoolId === schoolId)) return;
  }
  throw new Error("Unauthorized to list users");
}

async function assertCanCreateUsers(ctx: AuthContext) {
  await assertFeature(ctx, "/admin/users");
}

/**
 * Get the last login timestamps for a list of user IDs by querying user_sessions
 * @param userIds Array of user IDs to query
 * @returns Map of userId to lastLoginAt timestamp (ISO string) or null if no session found
 */
async function getLastLoginTimestamps(
  userIds: string[]
): Promise<Map<string, string | null>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const sessionMap = new Map<string, string | null>();

  // Initialize all user IDs with null
  userIds.forEach((id) => sessionMap.set(id, null));

  try {
    // Query user_sessions using Drizzle
    // Get all sessions for the given user IDs
    const sessions = await db
      .select({
        userId: userSessions.userId,
        refreshedAt: userSessions.refreshedAt,
        updatedAt: userSessions.updatedAt,
        createdAt: userSessions.createdAt,
      })
      .from(userSessions)
      .where(inArray(userSessions.userId, userIds));

    // Group by user_id and get the most recent session
    // For each session, use the maximum of refreshed_at, updated_at, created_at
    // Then across all sessions, use the maximum of those values
    const userSessionsMap = new Map<string, string>();

    sessions.forEach((session) => {
      const userId = session.userId;
      
      // Get all available timestamps for this session
      const timestamps: string[] = [];
      if (session.refreshedAt) timestamps.push(session.refreshedAt);
      if (session.updatedAt) timestamps.push(session.updatedAt);
      if (session.createdAt) timestamps.push(session.createdAt);
      
      // Find the maximum timestamp for this session
      if (timestamps.length > 0) {
        const sessionLastLogin = timestamps.reduce((max, current) => {
          return new Date(current).getTime() > new Date(max).getTime()
            ? current
            : max;
        });

        // Compare with existing value for this user and keep the maximum
        const existing = userSessionsMap.get(userId);
        if (
          !existing ||
          new Date(sessionLastLogin).getTime() > new Date(existing).getTime()
        ) {
          userSessionsMap.set(userId, sessionLastLogin);
        }
      }
    });

    // Update the main map with session data
    userSessionsMap.forEach((lastLogin, userId) => {
      sessionMap.set(userId, lastLogin);
    });
  } catch (error) {
    console.error("Error in getLastLoginTimestamps:", error);
    // Return map with all nulls if query fails completely
  }

  return sessionMap;
}

export const userService = {
  async listAllUsers(ctx: AuthContext, query: unknown) {
    const params: ListUsersParams = listUsersSchema.parse(query);
    
    // Resolve schoolId if it's a slug (not a UUID)
    let resolvedSchoolId: string | undefined = params.schoolId;
    if (params.schoolId && !isValidUUID(params.schoolId)) {
      // It's a slug, resolve it to an ID
      const schoolResults = await schoolRepo.getBySlug(params.schoolId);
      if (schoolResults.length > 0) {
        resolvedSchoolId = schoolResults[0].id;
      } else {
        // Slug not found, return empty results
        return { users: [], totalCount: 0 };
      }
    }

    // Check permissions - platform admins or users with roles in the requested school
    await assertCanListAllUsers(ctx, resolvedSchoolId);

    const result = await userRepo.getAllUsersWithRolesAndSchools({
      ...params,
      schoolId: resolvedSchoolId,
    });

    // Enrich users with last login timestamps from user_sessions
    if (result.users.length > 0) {
      const userIds = result.users.map((user) => user.id);
      const lastLoginMap = await getLastLoginTimestamps(userIds);

      // Add lastLoginAt to each user
      const enrichedUsers = result.users.map((user) => ({
        ...user,
        lastLoginAt: lastLoginMap.get(user.id) || null,
      }));

      return {
        ...result,
        users: enrichedUsers,
      };
    }

    return result;
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

