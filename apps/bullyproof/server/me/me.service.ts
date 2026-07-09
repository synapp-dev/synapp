import {
  getUserByIdSchema,
  getUserByEmailSchema,
  updateUserProfileSchema,
  getSchoolsByUserIdSchema,
} from "./me.validators";
import { meRepo } from "@/server/me/me.repo";
import { assertFeature } from "@/server/features/features.service";
import { featuresRepo } from "@/server/features/features.repo";
import { db } from "@/server/db/drizzle";
import { userRoles } from "@/server/db/schema";
import { eq } from "drizzle-orm";

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
  if (ctx.userId === targetUserId) return;
  await assertFeature(ctx, "/admin/users");
}

function resolveMaintenanceBypass(user: any): boolean {
  return !!(
    process.env.MAINTENANCE_BYPASS_DEV_KEY &&
    (user?.metadata as Record<string, unknown> | null)?.devKey ===
      process.env.MAINTENANCE_BYPASS_DEV_KEY
  );
}

async function buildUserWithFeaturePermissions(userId: string, user: any) {
  const permissions = await featuresRepo.getUserPermissions(userId);
  const userRolesData = await db
    .select({
      roleId: userRoles.roleId,
      schoolId: userRoles.schoolId,
    })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));

  const userSchoolIds = userRolesData
    .map((ur) => ur.schoolId)
    .filter((id): id is string => id !== null);
  const userRoleIds = userRolesData.map((ur) => ur.roleId);

  const featurePermissionsMap: Record<
    string,
    {
      global?: { enabled: boolean; visible: boolean | null };
      schools: Record<string, { enabled: boolean; visible: boolean | null }>;
      roles: Record<string, { enabled: boolean; visible: boolean | null }>;
      schoolRoles: Record<
        string,
        Record<string, { enabled: boolean; visible: boolean | null }>
      >;
      user?: { enabled: boolean; visible: boolean | null };
    }
  > = {};

  permissions.forEach((p) => {
    const featureKey = p.feature.key;
    if (!featurePermissionsMap[featureKey]) {
      featurePermissionsMap[featureKey] = {
        schools: {},
        roles: {},
        schoolRoles: {},
      };
    }

    const level = p.permission.level;
    const enabled = p.permission.enabled;
    const visible = p.permission.visible ?? null;
    const levelValue = { enabled, visible };

    if (level === "global") {
      featurePermissionsMap[featureKey].global = levelValue;
    } else if (level === "school" && p.permission.targetId) {
      featurePermissionsMap[featureKey].schools[p.permission.targetId] = levelValue;
    } else if (
      level === "school_role" &&
      p.permission.targetId &&
      (p.permission as any).schoolId
    ) {
      const schoolId = (p.permission as any).schoolId as string;
      if (!featurePermissionsMap[featureKey].schoolRoles[schoolId]) {
        featurePermissionsMap[featureKey].schoolRoles[schoolId] = {};
      }
      featurePermissionsMap[featureKey].schoolRoles[schoolId][p.permission.targetId] =
        levelValue;
    } else if (level === "role" && p.permission.targetId) {
      featurePermissionsMap[featureKey].roles[p.permission.targetId] = levelValue;
    } else if (level === "user") {
      featurePermissionsMap[featureKey].user = levelValue;
    }
  });

  return {
    ...user,
    featurePermissions: featurePermissionsMap,
    schoolIds: userSchoolIds,
    roleIds: userRoleIds,
    maintenanceBypass: resolveMaintenanceBypass(user),
  };
}

export const meService = {
  async getUserById(ctx: AuthContext, params: unknown) {
    const { id } = getUserByIdSchema.parse(params);
    await assertCanAccessUserProfile(ctx, id);

    const rows = await meRepo.getProfileByUserId(id);
    return rows[0] ?? null;
  },

  async getUserByIdForViewMode(
    ctx: AuthContext,
    params: unknown,
    includeFeaturePermissions = false
  ) {
    const { id } = getUserByIdSchema.parse(params);
    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }

    // View-as simulation is only available to users who can use impersonation.
    await assertFeature(ctx, "system:impersonate");

    const rows = await meRepo.getProfileByUserId(id);
    const user = rows[0] ?? null;
    if (!user) return null;

    if (includeFeaturePermissions) {
      try {
        return await buildUserWithFeaturePermissions(id, user);
      } catch (error) {
        console.error("Failed to load feature permissions for view mode:", error);
      }
    }

    return { ...user, maintenanceBypass: resolveMaintenanceBypass(user) };
  },

  async getUserByEmail(ctx: AuthContext, params: unknown) {
    const { email } = getUserByEmailSchema.parse(params);
    await assertFeature(ctx, "/admin/users");
    const rows = await meRepo.getProfileByUserEmail(email);
    return rows[0] ?? null;
  },

  async getCurrentUser(ctx: AuthContext, includeFeaturePermissions = false) {
    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }

    const rows = await meRepo.getProfileByUserId(ctx.userId);
    const user = rows[0] ?? null;

    const maintenanceBypass = resolveMaintenanceBypass(user);

    // Optionally include feature permissions
    if (user && includeFeaturePermissions) {
      try {
        return await buildUserWithFeaturePermissions(ctx.userId, user);
      } catch (error) {
        // If feature permissions fail to load, return user without them
        console.error("Failed to load feature permissions:", error);
        return user ? { ...user, maintenanceBypass } : user;
      }
    }

    return user ? { ...user, maintenanceBypass } : user;
  },

  async updateUserProfile(ctx: AuthContext, params: unknown) {
    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }

    updateUserProfileSchema.parse(params);

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

    if (ctx.userId !== id) {
      await assertFeature(ctx, "/admin/users");
    }

    return await meRepo.getAssignedSchoolsByUserId(id, limit);
  },
};
