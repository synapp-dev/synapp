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

export const meService = {
  async getUserById(ctx: AuthContext, params: unknown) {
    const { id } = getUserByIdSchema.parse(params);
    await assertCanAccessUserProfile(ctx, id);

    const rows = await meRepo.getProfileByUserId(id);
    return rows[0] ?? null;
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

    const maintenanceBypass = !!(
      process.env.MAINTENANCE_BYPASS_DEV_KEY &&
      (user?.metadata as Record<string, unknown> | null)?.devKey ===
        process.env.MAINTENANCE_BYPASS_DEV_KEY
    );

    // Optionally include feature permissions
    if (user && includeFeaturePermissions) {
      try {
        // Get all permissions for the user (across all schools)
        const permissions = await featuresRepo.getUserPermissions(ctx.userId);
        
        // Get user's roles and schools to build permission map
        const userRolesData = await db
          .select({
            roleId: userRoles.roleId,
            schoolId: userRoles.schoolId,
          })
          .from(userRoles)
          .where(eq(userRoles.userId, ctx.userId));
        
        const userSchoolIds = userRolesData
          .map((ur) => ur.schoolId)
          .filter((id): id is string => id !== null);
        
        const userRoleIds = userRolesData.map((ur) => ur.roleId);

        // Build a map: featureKey -> { global?, schools, roles, schoolRoles, user? } with { enabled, visible } per level
        const featurePermissionsMap: Record<
          string,
          {
            global?: { enabled: boolean; visible: boolean | null };
            schools: Record<string, { enabled: boolean; visible: boolean | null }>;
            roles: Record<string, { enabled: boolean; visible: boolean | null }>;
            schoolRoles: Record<string, Record<string, { enabled: boolean; visible: boolean | null }>>;
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
          } else if (level === "school_role" && p.permission.targetId && (p.permission as any).schoolId) {
            const schoolId = (p.permission as any).schoolId as string;
            if (!featurePermissionsMap[featureKey].schoolRoles[schoolId]) {
              featurePermissionsMap[featureKey].schoolRoles[schoolId] = {};
            }
            featurePermissionsMap[featureKey].schoolRoles[schoolId][p.permission.targetId] = levelValue;
          } else if (level === "role" && p.permission.targetId) {
            featurePermissionsMap[featureKey].roles[p.permission.targetId] = levelValue;
          } else if (level === "user") {
            featurePermissionsMap[featureKey].user = levelValue;
          }
        });

        const result = {
          ...user,
          featurePermissions: featurePermissionsMap,
          // Also include user's school IDs and role IDs for convenience
          schoolIds: userSchoolIds,
          roleIds: userRoleIds,
          maintenanceBypass,
        };

        // Debug logging for lessons
        if (featurePermissionsMap["/school/lessons"]) {
          console.log("[/school/lessons] User feature permissions loaded:", {
            userId: ctx.userId,
            schoolIds: userSchoolIds,
            roleIds: userRoleIds,
            lessonsPermission: featurePermissionsMap["/school/lessons"],
          });
        }

        return result;
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

    if (ctx.userId !== id) {
      await assertFeature(ctx, "/admin/users");
    }

    return await meRepo.getAssignedSchoolsByUserId(id, limit);
  },
};
