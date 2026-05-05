import {
  type AdminAreaSlug,
  ROLE_DEVELOPER,
} from "./rbac-constants";

export function hasRoleSlug(
  slugs: readonly string[],
  required: string,
): boolean {
  return slugs.includes(required);
}

/**
 * True if the user has the given capability slug, or has `developer` (implies all).
 */
export function hasCapability(
  slugs: readonly string[],
  required: string,
): boolean {
  if (slugs.includes(ROLE_DEVELOPER)) return true;
  return slugs.includes(required);
}

export function hasAnyAdminSlug(
  slugs: readonly string[],
  adminSlugs: readonly AdminAreaSlug[],
): boolean {
  if (slugs.includes(ROLE_DEVELOPER)) return true;
  return adminSlugs.some((s) => slugs.includes(s));
}
