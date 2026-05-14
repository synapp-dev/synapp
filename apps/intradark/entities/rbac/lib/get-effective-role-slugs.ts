import { eq } from "drizzle-orm";

import { RBAC_ROLE_QUERY_FAILED } from "@/entities/admin/lib/rbac-log-codes";
import { db } from "@/server/db/drizzle";
import {
  roles,
  roleTemplateRoles,
  userProfiles,
  userRoles,
  userRoleTemplates,
} from "@/server/db/schema";

import { NAV_ANONYMOUS_SLUGS } from "./nav-slugs";

/**
 * Direct `user_roles` ∪ slugs expanded from `user_role_templates` for one auth user.
 */
export async function getEffectiveRoleSlugsForUser(
  userId: string,
): Promise<readonly string[]> {
  try {
    const directRows = await db
      .select({ slug: roles.slug })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .innerJoin(userProfiles, eq(userRoles.userProfileId, userProfiles.id))
      .where(eq(userProfiles.userId, userId));

    const templateRows = await db
      .select({ slug: roles.slug })
      .from(userRoleTemplates)
      .innerJoin(
        roleTemplateRoles,
        eq(userRoleTemplates.templateId, roleTemplateRoles.templateId),
      )
      .innerJoin(roles, eq(roleTemplateRoles.roleId, roles.id))
      .innerJoin(userProfiles, eq(userRoleTemplates.userProfileId, userProfiles.id))
      .where(eq(userProfiles.userId, userId));

    const set = new Set<string>();
    for (const r of directRows) set.add(r.slug);
    for (const r of templateRows) set.add(r.slug);
    return [...set].sort();
  } catch (err) {
    console.error(RBAC_ROLE_QUERY_FAILED, err);
    return [];
  }
}

/** Anonymous session — implicit catalog-aligned slugs (no `user_profiles` row). */
export function getAnonymousEffectiveSlugs(): readonly string[] {
  return NAV_ANONYMOUS_SLUGS;
}

export async function getEffectiveSlugsForPrincipal(
  userId: string | null,
): Promise<readonly string[]> {
  if (!userId) return getAnonymousEffectiveSlugs();
  return getEffectiveRoleSlugsForUser(userId);
}
