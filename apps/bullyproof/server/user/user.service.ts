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
import { resolveSchoolId } from "@/server/school/resolve-school-ref";
import { db } from "@/server/db/drizzle";
import { userProfile, userSchoolPositions, userSessions } from "@/drizzle/schema";
import { sql, desc, inArray, eq, and } from "drizzle-orm";

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
 * Get the last activity timestamps for a list of user IDs.
 * Uses user_profile.last_seen_at (updated on site usage via middleware) with fallback
 * to user_sessions (token refresh) during transition.
 * @param userIds Array of user IDs to query
 * @returns Map of userId to lastLoginAt timestamp (ISO string) or null if none found
 */
async function getLastLoginTimestamps(
  userIds: string[]
): Promise<Map<string, string | null>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const resultMap = new Map<string, string | null>();
  userIds.forEach((id) => resultMap.set(id, null));

  try {
    // Primary source: last_seen_at from user_profile (updated on site activity)
    const profiles = await db
      .select({
        id: userProfile.id,
        lastSeenAt: userProfile.lastSeenAt,
      })
      .from(userProfile)
      .where(inArray(userProfile.id, userIds));

    // Fallback: user_sessions (refreshed_at, updated_at, created_at)
    const sessions = await db
      .select({
        userId: userSessions.userId,
        refreshedAt: userSessions.refreshedAt,
        updatedAt: userSessions.updatedAt,
        createdAt: userSessions.createdAt,
      })
      .from(userSessions)
      .where(inArray(userSessions.userId, userIds));

    // Build best session timestamp per user
    const sessionBest = new Map<string, string>();
    for (const s of sessions) {
      const timestamps: string[] = [];
      if (s.refreshedAt) timestamps.push(s.refreshedAt);
      if (s.updatedAt) timestamps.push(s.updatedAt);
      if (s.createdAt) timestamps.push(s.createdAt);
      if (timestamps.length === 0) continue;
      const best = timestamps.reduce((max, t) =>
        new Date(t).getTime() > new Date(max).getTime() ? t : max
      );
      const existing = sessionBest.get(s.userId);
      if (!existing || new Date(best).getTime() > new Date(existing).getTime()) {
        sessionBest.set(s.userId, best);
      }
    }

    // Use last_seen_at when available, else fall back to session data
    for (const p of profiles) {
      const sessionVal = sessionBest.get(p.id);
      const lastSeen = p.lastSeenAt;
      if (lastSeen && sessionVal) {
        resultMap.set(
          p.id,
          new Date(lastSeen).getTime() > new Date(sessionVal).getTime()
            ? lastSeen
            : sessionVal
        );
      } else {
        resultMap.set(p.id, lastSeen || sessionVal || null);
      }
    }

    // Users not in profiles but in sessions (edge case)
    for (const [userId, best] of sessionBest) {
      if (!resultMap.get(userId)) {
        resultMap.set(userId, best);
      }
    }
  } catch (error) {
    console.error("Error in getLastLoginTimestamps:", error);
  }

  return resultMap;
}

async function getSchoolPositionsByUser(
  userIds: string[],
  schoolId?: string
): Promise<Map<string, Array<{ id: string; schoolId: string; position: string }>>> {
  const positionsByUser = new Map<
    string,
    Array<{ id: string; schoolId: string; position: string }>
  >();

  if (userIds.length === 0) return positionsByUser;

  const baseCondition = inArray(userSchoolPositions.userId, userIds);
  const whereCondition = schoolId
    ? and(baseCondition, eq(userSchoolPositions.schoolId, schoolId))
    : baseCondition;

  const positions = await db
    .select({
      id: userSchoolPositions.id,
      userId: userSchoolPositions.userId,
      schoolId: userSchoolPositions.schoolId,
      position: userSchoolPositions.position,
    })
    .from(userSchoolPositions)
    .where(whereCondition);

  for (const position of positions) {
    const existing = positionsByUser.get(position.userId) ?? [];
    existing.push({
      id: position.id,
      schoolId: position.schoolId,
      position: position.position,
    });
    positionsByUser.set(position.userId, existing);
  }

  return positionsByUser;
}

export const userService = {
  async listAllUsers(ctx: AuthContext, query: unknown) {
    const params: ListUsersParams = listUsersSchema.parse(query);
    
    let resolvedSchoolId: string | undefined = params.schoolId;
    if (params.schoolId) {
      const schoolId = await resolveSchoolId(params.schoolId);
      if (!schoolId) {
        return { users: [], totalCount: 0 };
      }
      resolvedSchoolId = schoolId;
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
      const schoolPositionsByUser = await getSchoolPositionsByUser(
        userIds,
        resolvedSchoolId
      );

      // Add lastLoginAt to each user
      const enrichedUsers = result.users.map((user) => ({
        ...user,
        schoolPositions: schoolPositionsByUser.get(user.id) ?? [],
        lastLoginAt: lastLoginMap.get(user.id) || null,
      }));

      return {
        ...result,
        users: enrichedUsers,
      };
    }

    return {
      ...result,
      users: result.users.map((user) => ({
        ...user,
        schoolPositions: [],
      })),
    };
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

