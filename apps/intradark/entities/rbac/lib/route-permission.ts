import { ROLE_DEVELOPER } from "@/entities/admin/lib/rbac-constants";

/**
 * Route and nav checks: `developer` implies all gated product routes (staff platform).
 */
export function hasRoutePermission(
  effectiveSlugs: readonly string[],
  requiredSlug: string,
): boolean {
  if (effectiveSlugs.includes(ROLE_DEVELOPER)) return true;
  return effectiveSlugs.includes(requiredSlug);
}
