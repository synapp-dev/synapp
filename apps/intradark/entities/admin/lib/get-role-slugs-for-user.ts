import { eq } from "drizzle-orm";

import { RBAC_ROLE_QUERY_FAILED } from "./rbac-log-codes";
import { db } from "@/server/db/drizzle";
import { roles, userProfiles, userRoles } from "@/server/db/schema";

/** `userId` is `auth.users.id` (same as `user_profiles.user_id`). */
export async function getRoleSlugsForUser(
  userId: string,
): Promise<readonly string[]> {
  try {
    const rows = await db
      .select({ slug: roles.slug })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .innerJoin(userProfiles, eq(userRoles.userProfileId, userProfiles.id))
      .where(eq(userProfiles.userId, userId));
    return rows.map((r) => r.slug);
  } catch (err) {
    console.error(RBAC_ROLE_QUERY_FAILED, err);
    return [];
  }
}
