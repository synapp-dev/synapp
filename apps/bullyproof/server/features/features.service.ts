import { featuresRepo } from "./features.repo";
import type { FeaturePermissionLevel } from "./features.repo";
import { rolesRepo } from "@/server/roles/roles.repo";
import { MAINTENANCE_FEATURE_KEY, MAINTENANCE_BYPASS_ROLE_KEY } from "@/lib/feature-keys";
import { assertActorCanManageIntradarkDevTarget } from "@/server/auth/intradark-dev-account-guard";

// Auth context for feature management; authorization is from feature_permissions (/admin/features)
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

/**
 * Check if a user has access to a feature using hierarchical resolution.
 * Priority: User > School Role > School > Role > Global (most specific wins)
 * 
 * Default behavior: Features are disabled by default (allow-list)
 * Returns true only if explicitly enabled at any level
 */
export async function checkFeatureAccess(
  userId: string,
  featureKey: string,
  schoolId?: string
): Promise<boolean> {
  // Get all relevant permissions for this user and feature
  const permissions = await featuresRepo.getFeaturePermissionsForUser(
    featureKey,
    userId,
    schoolId
  );

  // If no permissions exist, feature is disabled by default
  if (permissions.length === 0) {
    // Backward-compat: AP Certification is a sub-area under /courses.
    // If /ap-certification has no explicit rows, inherit /courses access.
    if (featureKey === "/ap-certification") {
      return checkFeatureAccess(userId, "/courses", schoolId);
    }
    return false;
  }

  // Permissions are already ordered by priority (user > school_role > school > role > global)
  const userLevel = permissions.find((p) => p.level === "user");
  if (userLevel) {
    return userLevel.enabled;
  }

  // A user can hold several roles; within a role-based level, any enabled
  // role wins (mirrors checkFeatureAccessAndVisibleCached on the client).
  const schoolRoleLevels = permissions.filter((p) => p.level === "school_role");
  if (schoolRoleLevels.length > 0) {
    return schoolRoleLevels.some((p) => p.enabled);
  }

  const schoolLevel = permissions.find((p) => p.level === "school");
  if (schoolLevel) {
    return schoolLevel.enabled;
  }

  const roleLevels = permissions.filter((p) => p.level === "role");
  if (roleLevels.length > 0) {
    return roleLevels.some((p) => p.enabled);
  }

  const globalLevel = permissions.find((p) => p.level === "global");
  if (globalLevel) {
    return globalLevel.enabled;
  }

  // No enabled permission found
  return false;
}

/**
 * Context type for feature assertions (userId required for checks).
 */
export type FeatureAuthContext = {
  userId: string | null;
  roles?: string[];
};

/**
 * Assert that the user has access to the given feature; throws if not.
 * Use for API/server authorization. No schoolId = platform-level feature.
 */
export async function assertFeature(
  ctx: FeatureAuthContext,
  featureKey: string,
  schoolId?: string
): Promise<void> {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }
  const hasAccess = await checkFeatureAccess(ctx.userId, featureKey, schoolId);
  if (!hasAccess) {
    throw new Error("Unauthorized");
  }
}

/**
 * Get all feature permissions for a user
 */
export async function getUserFeaturePermissions(
  userId: string,
  schoolId?: string
) {
  return featuresRepo.getUserPermissions(userId, schoolId);
}

/**
 * Get permissions for a specific feature
 */
export async function getFeaturePermissions(
  featureId: string,
  level?: FeaturePermissionLevel,
  targetId?: string,
  schoolId?: string
) {
  if (level) {
    return featuresRepo.getPermissionsByLevel(featureId, level, targetId, schoolId);
  }
  return featuresRepo.getFeaturePermissions(featureId);
}

/**
 * Get all permissions at a level in one query (bulk for admin).
 * level=global -> all global; level=role/school/user requires targetId.
 * level=school_role requires targetId (roleId) and schoolId.
 */
export async function getAllPermissionsByLevel(
  level: FeaturePermissionLevel,
  targetId?: string,
  schoolId?: string
) {
  return featuresRepo.getAllPermissionsByLevel(level, targetId, schoolId);
}

/** Feature key that grants access to the admin Features section (list/set permissions, etc.) */
const ADMIN_FEATURES_KEY = "/admin/features";

/**
 * Assert that user can manage features.
 * Uses feature_permissions only: user must have /admin/features enabled (user > school > role > global).
 */
async function assertCanManageFeatures(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  const canManage = await checkFeatureAccess(ctx.userId, ADMIN_FEATURES_KEY);
  if (!canManage) {
    throw new Error("Unauthorized to manage features");
  }
}

/**
 * Assert that user can VIEW feature access state (read-only oversight).
 * Managing requires /admin/features; school oversight (/admin/schools)
 * grants a read-only view of features and their school-level state.
 */
async function assertCanViewFeatures(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  const canManage = await checkFeatureAccess(ctx.userId, ADMIN_FEATURES_KEY);
  if (canManage) return;
  const canOversee = await checkFeatureAccess(ctx.userId, "/admin/schools");
  if (canOversee) return;
  throw new Error("Unauthorized to view features");
}

export const featuresService = {
  /**
   * List all features
   */
  async listFeatures(ctx: AuthContext) {
    await assertCanViewFeatures(ctx);
    return featuresRepo.getAll();
  },

  /**
   * Get a feature by ID
   */
  async getFeatureById(ctx: AuthContext, featureId: string) {
    await assertCanManageFeatures(ctx);
    const result = await featuresRepo.getById(featureId);
    return result[0] ?? null;
  },

  /**
   * Get a feature by key
   */
  async getFeatureByKey(ctx: AuthContext, featureKey: string) {
    await assertCanManageFeatures(ctx);
    const result = await featuresRepo.getByKey(featureKey);
    return result[0] ?? null;
  },

  /**
   * Create a new feature
   */
  async createFeature(
    ctx: AuthContext,
    data: {
      key: string;
      name: string;
      description?: string;
      category?: string;
      section?: string;
    }
  ) {
    await assertCanManageFeatures(ctx);

    // Check if feature with this key already exists
    const existing = await featuresRepo.getByKey(data.key);
    if (existing.length > 0) {
      throw new Error(`Feature with key "${data.key}" already exists`);
    }

    const result = await featuresRepo.create(data);
    return result[0];
  },

  /**
   * Update a feature
   */
  async updateFeature(
    ctx: AuthContext,
    featureId: string,
    data: {
      name?: string;
      description?: string;
      category?: string;
      section?: string;
    }
  ) {
    await assertCanManageFeatures(ctx);
    const result = await featuresRepo.update(featureId, data);
    return result[0] ?? null;
  },

  /**
   * Delete a feature
   */
  async deleteFeature(ctx: AuthContext, featureId: string) {
    await assertCanManageFeatures(ctx);
    await featuresRepo.delete(featureId);
  },

  /**
   * Get permissions for a feature
   */
  async getFeaturePermissions(
    ctx: AuthContext,
    featureId: string,
    level?: FeaturePermissionLevel,
    targetId?: string,
    schoolId?: string
  ) {
    await assertCanViewFeatures(ctx);
    return getFeaturePermissions(featureId, level, targetId, schoolId);
  },

  /**
   * Get all permissions at a level (bulk for admin store)
   */
  async getAllPermissionsByLevel(
    ctx: AuthContext,
    level: FeaturePermissionLevel,
    targetId?: string,
    schoolId?: string
  ) {
    await assertCanManageFeatures(ctx);
    return getAllPermissionsByLevel(level, targetId, schoolId);
  },

  /**
   * Set a permission for a feature
   */
  async setFeaturePermission(
    ctx: AuthContext,
    data: {
      featureId: string;
      level: FeaturePermissionLevel;
      targetId?: string;
      schoolId?: string;
      enabled: boolean;
      visible?: boolean | null;
    }
  ) {
    await assertCanManageFeatures(ctx);

    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }

    if (data.level === "user" && data.targetId) {
      await assertActorCanManageIntradarkDevTarget(ctx.userId, data.targetId);
    }

    const result = await featuresRepo.setPermission({
      ...data,
      createdBy: ctx.userId,
    });

    // When maintenance is enabled globally, ensure INTRADARK_DEV role has it disabled (override)
    const featureRows = await featuresRepo.getById(data.featureId);
    const feature = featureRows[0];
    if (
      feature?.key === MAINTENANCE_FEATURE_KEY &&
      data.level === "global" &&
      data.enabled === true
    ) {
      const roleRows = await rolesRepo.getByKey(MAINTENANCE_BYPASS_ROLE_KEY);
      const role = roleRows[0];
      if (role) {
        await featuresRepo.setPermission({
          featureId: data.featureId,
          level: "role",
          targetId: role.id,
          enabled: false,
          visible: false,
          createdBy: ctx.userId,
        });
      }
    }

    return result[0];
  },

  /**
   * Remove a permission
   */
  async removeFeaturePermission(
    ctx: AuthContext,
    featureId: string,
    level: FeaturePermissionLevel,
    targetId?: string,
    schoolId?: string
  ) {
    await assertCanManageFeatures(ctx);

    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }
    if (level === "user" && targetId) {
      await assertActorCanManageIntradarkDevTarget(ctx.userId, targetId);
    }

    await featuresRepo.removePermission(featureId, level, targetId, schoolId);
  },

  /**
   * Check if user has access to a feature
   * This is the main function used by the frontend
   */
  async checkFeatureAccess(
    userId: string,
    featureKey: string,
    schoolId?: string
  ) {
    return checkFeatureAccess(userId, featureKey, schoolId);
  },

  /**
   * Get all feature permissions for a user
   */
  async getUserFeaturePermissions(userId: string, schoolId?: string) {
    return getUserFeaturePermissions(userId, schoolId);
  },
};
