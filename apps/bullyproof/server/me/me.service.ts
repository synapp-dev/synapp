import {
  getUserByIdSchema,
  getUserByEmailSchema,
  updateUserProfileSchema,
  getSchoolsByUserIdSchema,
} from "./me.validators";
import { meRepo } from "@/server/me/me.repo";
import { getUserScopedRoles } from "@/server/auth/rbac";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanAccessUserProfile(
  ctx: AuthContext,
  targetUserId: string
) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  // Users can access their own profile
  if (ctx.userId === targetUserId) {
    return;
  }

  // Check if user has platform admin role
  const roles = await getUserScopedRoles(ctx.userId);
  if (roles.platform.includes("PLATFORM_ADMIN")) {
    return;
  }

  throw new Error("Unauthorized to access this user profile");
}

export const meService = {
  async getUserById(ctx: AuthContext, params: unknown) {
    const { id } = getUserByIdSchema.parse(params);
    await assertCanAccessUserProfile(ctx, id);

    const rows = await meRepo.getProfileByUserId(id);
    return rows[0] ?? null;
  },

  async getUserByEmail(ctx: AuthContext, params: unknown) {
    const { email } = getUserByEmailSchema.parse(params);

    // Only allow platform admins to search by email
    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }

    const roles = await getUserScopedRoles(ctx.userId);
    if (!roles.platform.includes("PLATFORM_ADMIN")) {
      throw new Error("Unauthorized to search users by email");
    }

    const rows = await meRepo.getProfileByUserEmail(email);
    return rows[0] ?? null;
  },

  async getCurrentUser(ctx: AuthContext) {
    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }

    const rows = await meRepo.getProfileByUserId(ctx.userId);
    return rows[0] ?? null;
  },

  async updateUserProfile(ctx: AuthContext, params: unknown) {
    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }

    const updateData = updateUserProfileSchema.parse(params);

    // For now, just return the current user - you'll need to implement actual update logic
    // This would typically involve updating the user_profile table
    const rows = await meRepo.getProfileByUserId(ctx.userId);
    return rows[0] ?? null;
  },

  async getSchoolsByUserId(ctx: AuthContext, params: unknown) {
    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }

    const { id, limit } = getSchoolsByUserIdSchema.parse(params);

    // Users can only get their own schools, or platform admins can get any user's schools
    if (ctx.userId !== id) {
      const roles = await getUserScopedRoles(ctx.userId);
      if (!roles.platform.includes("PLATFORM_ADMIN")) {
        throw new Error("Unauthorized to access this user's schools");
      }
    }

    return await meRepo.getAssignedSchoolsByUserId(id, limit);
  },
};
