import type { FeaturePermissions } from "@/entities/me/model/store";

/**
 * Resolved access and visibility for a feature.
 * Hierarchical resolution: User > School Role > School > Platform Role > Global.
 * visible: when DB visible is null, resolved visible = enabled (backward compat).
 */
export function checkFeatureAccessAndVisibleCached(
  featurePermissions: FeaturePermissions | undefined,
  featureKey: string,
  schoolId?: string,
  userRoleIds?: string[]
): { hasAccess: boolean; visible: boolean } {
  if (!featurePermissions || !featurePermissions[featureKey]) {
    return { hasAccess: false, visible: false };
  }

  const permissions = featurePermissions[featureKey];

  // Helper: at a level, resolved visible = visible ?? enabled
  const visibleAt = (level: { enabled: boolean; visible: boolean | null } | undefined) =>
    level ? (level.visible ?? level.enabled) : undefined;

  // Priority 1: User-level
  if (permissions.user !== undefined) {
    return {
      hasAccess: permissions.user.enabled,
      visible: visibleAt(permissions.user) ?? false,
    };
  }

  // Priority 2: School Role (role-specific within a school)
  if (schoolId && userRoleIds && userRoleIds.length > 0 && permissions.schoolRoles) {
    const schoolRolePerms = permissions.schoolRoles[schoolId];
    if (schoolRolePerms) {
      const enabledRoleId = userRoleIds.find(
        (roleId) => schoolRolePerms[roleId]?.enabled === true
      );
      if (enabledRoleId !== undefined) {
        const level = schoolRolePerms[enabledRoleId];
        return {
          hasAccess: true,
          visible: visibleAt(level) ?? true,
        };
      }
      const anyRoleId = userRoleIds.find((roleId) => schoolRolePerms[roleId] !== undefined);
      if (anyRoleId !== undefined) {
        const level = schoolRolePerms[anyRoleId];
        return {
          hasAccess: false,
          visible: visibleAt(level) ?? false,
        };
      }
    }
  }

  // Priority 3: School-level
  if (schoolId && permissions.schools[schoolId] !== undefined) {
    const level = permissions.schools[schoolId];
    return {
      hasAccess: level.enabled,
      visible: visibleAt(level) ?? false,
    };
  }

  // Priority 4: Platform Role-level
  if (userRoleIds && userRoleIds.length > 0) {
    const enabledRoleId = userRoleIds.find(
      (roleId) => permissions.roles[roleId]?.enabled === true
    );
    if (enabledRoleId !== undefined) {
      const level = permissions.roles[enabledRoleId];
      return {
        hasAccess: true,
        visible: visibleAt(level) ?? true,
      };
    }
    const anyRoleId = userRoleIds.find((roleId) => permissions.roles[roleId] !== undefined);
    if (anyRoleId !== undefined) {
      const level = permissions.roles[anyRoleId];
      return {
        hasAccess: false,
        visible: visibleAt(level) ?? false,
      };
    }
  }

  // Priority 5: Global-level
  if (permissions.global !== undefined) {
    return {
      hasAccess: permissions.global.enabled,
      visible: visibleAt(permissions.global) ?? false,
    };
  }

  return { hasAccess: false, visible: false };
}

/**
 * Check if a user has access to a feature using cached permissions.
 * Implements the same hierarchical resolution as the server:
 * Priority: User > School Role > School > Platform Role > Global (most specific wins)
 *
 * @param featurePermissions - The cached feature permissions map from the user store
 * @param featureKey - The feature key to check (e.g., "/school/lessons", "/school/content", "/admin")
 * @param schoolId - Optional school ID for school-specific feature checks
 * @param userRoleIds - Optional array of role IDs the user has (for role-level checks)
 * @returns boolean indicating if the user has access
 */
export function checkFeatureAccessCached(
  featurePermissions: FeaturePermissions | undefined,
  featureKey: string,
  schoolId?: string,
  userRoleIds?: string[]
): boolean {
  return checkFeatureAccessAndVisibleCached(
    featurePermissions,
    featureKey,
    schoolId,
    userRoleIds
  ).hasAccess;
}
