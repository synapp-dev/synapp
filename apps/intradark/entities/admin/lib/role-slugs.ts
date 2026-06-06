import {
  type AdminAreaSlug,
  ROLE_DEVELOPER,
} from "./rbac-constants";
import { hasCapability } from "@/entities/rbac/lib/has-capability";

export { hasCapability };

export function hasRoleSlug(
  slugs: readonly string[],
  required: string,
): boolean {
  return slugs.includes(required);
}

export function hasAnyAdminSlug(
  slugs: readonly string[],
  adminSlugs: readonly AdminAreaSlug[],
): boolean {
  if (slugs.includes(ROLE_DEVELOPER)) return true;
  return adminSlugs.some((s) => slugs.includes(s));
}
