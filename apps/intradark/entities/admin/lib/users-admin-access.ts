import { ROLE_DEVELOPER } from "./rbac-constants";
import { hasRoleSlug } from "./role-slugs";

/**
 * Who may open the users admin panel and grant/revoke roles. Locked to
 * `developer` (literal — granting admin power is the keys-to-the-kingdom op).
 * Centralised here so the trust boundary can be widened in one place later.
 */
export function canManageUsers(slugs: readonly string[]): boolean {
  return hasRoleSlug(slugs, ROLE_DEVELOPER);
}
