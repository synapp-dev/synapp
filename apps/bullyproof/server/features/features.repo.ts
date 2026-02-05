import { db } from "@/server/db/drizzle";
import { features, featurePermissions, roles, userRoles, schools } from "@/server/db/schema";
import { eq, and, or, isNull, sql, inArray, desc } from "drizzle-orm";

export type FeaturePermissionLevel = "global" | "role" | "school" | "user";

export const featuresRepo = {
  /**
   * Get all features
   */
  getAll: () => db.select().from(features).orderBy(features.name),

  /**
   * Get feature by ID
   */
  getById: (id: string) =>
    db.select().from(features).where(eq(features.id, id)).limit(1),

  /**
   * Get feature by key
   */
  getByKey: (key: string) =>
    db.select().from(features).where(eq(features.key, key)).limit(1),

  /**
   * Create a new feature
   */
  create: (data: {
    key: string;
    name: string;
    description?: string;
    category?: string;
  }) =>
    db
      .insert(features)
      .values(data)
      .returning(),

  /**
   * Update a feature
   */
  update: (
    id: string,
    data: {
      name?: string;
      description?: string;
      category?: string;
    }
  ) =>
    db
      .update(features)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(features.id, id))
      .returning(),

  /**
   * Delete a feature (cascades to feature_permissions)
   */
  delete: (id: string) => db.delete(features).where(eq(features.id, id)),

  /**
   * Get all permissions for a feature
   */
  getFeaturePermissions: (featureId: string) =>
    db
      .select()
      .from(featurePermissions)
      .where(eq(featurePermissions.featureId, featureId))
      .orderBy(featurePermissions.level, featurePermissions.createdAt),

  /**
   * Get all permissions at a level in one query (for admin bulk load).
   * level=global → all global permissions; level=role/school/user + targetId → all for that target.
   */
  getAllPermissionsByLevel: (
    level: FeaturePermissionLevel,
    targetId?: string
  ) => {
    const conditions = [eq(featurePermissions.level, level)];
    if (targetId) {
      conditions.push(eq(featurePermissions.targetId, targetId));
    } else if (level === "global") {
      conditions.push(isNull(featurePermissions.targetId));
    }
    return db
      .select()
      .from(featurePermissions)
      .where(and(...conditions))
      .orderBy(featurePermissions.featureId, desc(featurePermissions.updatedAt));
  },

  /**
   * Get permissions for a feature at a specific level
   */
  getPermissionsByLevel: (
    featureId: string,
    level: FeaturePermissionLevel,
    targetId?: string
  ) => {
    const conditions = [
      eq(featurePermissions.featureId, featureId),
      eq(featurePermissions.level, level),
    ];

    if (targetId) {
      conditions.push(eq(featurePermissions.targetId, targetId));
    } else if (level === "global") {
      conditions.push(isNull(featurePermissions.targetId));
    } else {
      // For non-global levels, targetId should be provided
      // If not provided, we'll return all permissions at that level
    }

    return db
      .select()
      .from(featurePermissions)
      .where(and(...conditions))
      .orderBy(desc(featurePermissions.updatedAt));
  },

  /**
   * Set a permission for a feature at a specific level.
   * For global level we update-then-insert because UNIQUE(feature_id, level, target_id)
   * does not match when target_id is NULL (PostgreSQL treats NULLs as distinct in unique).
   */
  setPermission: async (data: {
    featureId: string;
    level: FeaturePermissionLevel;
    targetId?: string;
    enabled: boolean;
    visible?: boolean | null;
    createdBy?: string;
  }) => {
    const updatedAt = new Date().toISOString();
    const setFields: Record<string, unknown> = {
      enabled: data.enabled,
      updatedAt,
    };
    if (data.visible !== undefined) {
      setFields.visible = data.visible;
    }
    if (data.createdBy) {
      setFields.createdBy = data.createdBy;
    }

    if (data.level === "global") {
      // Update existing global row (target_id IS NULL); ON CONFLICT never matches NULL.
      const updated = await db
        .update(featurePermissions)
        .set(setFields)
        .where(
          and(
            eq(featurePermissions.featureId, data.featureId),
            eq(featurePermissions.level, "global"),
            isNull(featurePermissions.targetId)
          )
        )
        .returning();
      if (updated.length > 0) {
        return updated;
      }
      // No row yet: insert global permission
      const values: Record<string, unknown> = {
        featureId: data.featureId,
        level: "global",
        targetId: null,
        enabled: data.enabled,
        updatedAt,
      };
      if (data.visible !== undefined) values.visible = data.visible;
      if (data.createdBy) values.createdBy = data.createdBy;
      return db.insert(featurePermissions).values(values).returning();
    }

    // Non-global: targetId required; upsert matches on (featureId, level, targetId)
    if (!data.targetId) {
      throw new Error(`targetId is required for ${data.level} level permissions`);
    }
    const values: any = {
      featureId: data.featureId,
      level: data.level,
      targetId: data.targetId,
      enabled: data.enabled,
      updatedAt,
    };
    if (data.visible !== undefined) values.visible = data.visible;
    if (data.createdBy) values.createdBy = data.createdBy;
    const setClause: Record<string, any> = {
      enabled: sql`excluded.enabled`,
      updatedAt: sql`excluded.updated_at`,
      createdBy: sql`excluded.created_by`,
    };
    if (data.visible !== undefined) {
      setClause.visible = sql`excluded.visible`;
    }
    return db
      .insert(featurePermissions)
      .values(values)
      .onConflictDoUpdate({
        target: [
          featurePermissions.featureId,
          featurePermissions.level,
          featurePermissions.targetId,
        ],
        set: setClause,
      })
      .returning();
  },

  /**
   * Remove a permission
   */
  removePermission: (
    featureId: string,
    level: FeaturePermissionLevel,
    targetId?: string
  ) => {
    const conditions = [
      eq(featurePermissions.featureId, featureId),
      eq(featurePermissions.level, level),
    ];

    if (targetId) {
      conditions.push(eq(featurePermissions.targetId, targetId));
    } else {
      conditions.push(isNull(featurePermissions.targetId));
    }

    return db.delete(featurePermissions).where(and(...conditions));
  },

  /**
   * Get all permissions for a user (across all features)
   * This includes user-level, school-level, role-level, and global permissions
   */
  getUserPermissions: async (userId: string, schoolId?: string) => {
    // Get user's roles
    const userRolesData = await db
      .select({
        roleId: userRoles.roleId,
        schoolId: userRoles.schoolId,
      })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));

    const roleIds = userRolesData.map((ur) => ur.roleId);
    const userSchoolIds = userRolesData
      .map((ur) => ur.schoolId)
      .filter((id): id is string => id !== null);

    // If schoolId is provided, filter to that school
    const relevantSchoolIds = schoolId
      ? userSchoolIds.filter((id) => id === schoolId)
      : userSchoolIds;

    // Build conditions for permission lookup
    const permissionConditions = [
      // User-level permissions
      and(
        eq(featurePermissions.level, "user"),
        eq(featurePermissions.targetId, userId)
      ),
      // School-level permissions (for user's schools)
      ...(relevantSchoolIds.length > 0
        ? [
            and(
              eq(featurePermissions.level, "school"),
              inArray(featurePermissions.targetId, relevantSchoolIds)
            ),
          ]
        : []),
      // Role-level permissions (for user's roles)
      ...(roleIds.length > 0
        ? [
            and(
              eq(featurePermissions.level, "role"),
              inArray(featurePermissions.targetId, roleIds)
            ),
          ]
        : []),
      // Global permissions
      and(
        eq(featurePermissions.level, "global"),
        isNull(featurePermissions.targetId)
      ),
    ];

    return db
      .select({
        permission: featurePermissions,
        feature: features,
      })
      .from(featurePermissions)
      .innerJoin(features, eq(featurePermissions.featureId, features.id))
      .where(or(...permissionConditions));
  },

  /**
   * Get permissions for a specific feature and user
   * Returns permissions at all relevant levels (user, school, role, global)
   */
  getFeaturePermissionsForUser: async (
    featureKey: string,
    userId: string,
    schoolId?: string
  ) => {
    // First get the feature
    const featureResult = await featuresRepo.getByKey(featureKey);
    if (featureResult.length === 0) {
      return [];
    }
    const feature = featureResult[0];

    // Get user's roles
    const userRolesData = await db
      .select({
        roleId: userRoles.roleId,
        schoolId: userRoles.schoolId,
      })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));

    const roleIds = userRolesData.map((ur) => ur.roleId);
    const userSchoolIds = userRolesData
      .map((ur) => ur.schoolId)
      .filter((id): id is string => id !== null);

    // If schoolId is provided, filter to that school
    const relevantSchoolIds = schoolId
      ? userSchoolIds.filter((id) => id === schoolId)
      : userSchoolIds;

    // Build conditions
    const conditions = [
      eq(featurePermissions.featureId, feature.id),
      or(
        // User-level
        and(
          eq(featurePermissions.level, "user"),
          eq(featurePermissions.targetId, userId)
        ),
        // School-level
        ...(relevantSchoolIds.length > 0
          ? [
              and(
                eq(featurePermissions.level, "school"),
                inArray(featurePermissions.targetId, relevantSchoolIds)
              ),
            ]
          : []),
        // Role-level
        ...(roleIds.length > 0
          ? [
              and(
                eq(featurePermissions.level, "role"),
                inArray(featurePermissions.targetId, roleIds)
              ),
            ]
          : []),
        // Global
        and(
          eq(featurePermissions.level, "global"),
          isNull(featurePermissions.targetId)
        )
      ),
    ];

    return db
      .select()
      .from(featurePermissions)
      .where(and(...conditions))
      .orderBy(
        // Order by priority: user > school > role > global
        sql`CASE 
          WHEN level = 'user' THEN 1
          WHEN level = 'school' THEN 2
          WHEN level = 'role' THEN 3
          WHEN level = 'global' THEN 4
        END`
      );
  },
};
