import { notFound } from "next/navigation";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { hasRoleSlug } from "@/entities/admin/lib/role-slugs";
import { ROLE_DEVELOPER } from "@/entities/admin/lib/rbac-constants";

/**
 * Gate a placeholder admin module route to the literal `developer` role.
 * Shared by the per-module `/admin/*` placeholder pages until each grows its
 * own capability slug. 404s (not 403s) so the route is invisible to non-staff.
 */
export async function requireDeveloperOr404(): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) notFound();
  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!hasRoleSlug(slugs, ROLE_DEVELOPER)) notFound();
}
