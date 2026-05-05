import { hasCapability } from "@/entities/admin/lib/role-slugs";
import { ROLE_NEWS_EDITOR } from "@/entities/admin/lib/rbac-constants";

/** True when the user may author news (includes `developer` via `hasCapability`). */
export function hasNewsEditorRole(slugs: readonly string[]): boolean {
  return hasCapability(slugs, ROLE_NEWS_EDITOR);
}
