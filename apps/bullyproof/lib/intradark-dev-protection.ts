/** Platform role key for Intradark developer accounts (matches `roles.key`). */
export const INTRADARK_DEV_PLATFORM_ROLE_KEY = "INTRADARK_DEV";

/** Normalize platform role keys from API / DB (array or Postgres-style string). */
export function normalizePlatformRoleKeys(platformRoles: unknown): string[] {
  if (Array.isArray(platformRoles)) {
    return platformRoles.filter((r): r is string => typeof r === "string");
  }
  if (typeof platformRoles === "string") {
    const trimmed = platformRoles.replace(/^\{|\}$/g, "").trim();
    if (!trimmed) return [];
    return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function profileHasIntradarkDevPlatformRole(
  platformRoles: unknown
): boolean {
  return normalizePlatformRoleKeys(platformRoles).includes(
    INTRADARK_DEV_PLATFORM_ROLE_KEY
  );
}

/**
 * Whether the viewer may change another user's admin-visible profile/roles/features/etc.
 * Intradark dev accounts can only be mutated by users who hold INTRADARK_DEV.
 */
export function canManageIntradarkDevScopedUser(
  viewerPlatformRoles: unknown,
  targetPlatformRoles: unknown
): boolean {
  if (!profileHasIntradarkDevPlatformRole(targetPlatformRoles)) return true;
  return profileHasIntradarkDevPlatformRole(viewerPlatformRoles);
}
