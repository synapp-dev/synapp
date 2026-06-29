import { hasCapability } from "@/entities/admin/lib/role-slugs";
import { ROLE_UTILITY_EDITOR } from "@/entities/admin/lib/rbac-constants";

/** True when the user may review/publish utility lineups (includes `developer`). */
export function hasUtilityEditorRole(slugs: readonly string[]): boolean {
  return hasCapability(slugs, ROLE_UTILITY_EDITOR);
}
