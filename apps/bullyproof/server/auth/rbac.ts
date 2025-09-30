import { db } from "@/server/db/drizzle";
import { roles, userRoles } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export type UserScopedRoles = {
  platform: string[];
  school: { roleKey: string; schoolId: string }[];
};

export async function getUserScopedRoles(
  userId: string
): Promise<UserScopedRoles> {
  if (!userId) return { platform: [], school: [] };

  const rows = await db
    .select({
      roleKey: roles.key,
      roleScope: userRoles.roleScope,
      schoolId: userRoles.schoolId,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const result: UserScopedRoles = { platform: [], school: [] };
  for (const r of rows) {
    if (r.roleScope === "platform") {
      if (r.roleKey) result.platform.push(r.roleKey);
    } else if (r.roleScope === "school") {
      if (r.roleKey && r.schoolId)
        result.school.push({ roleKey: r.roleKey, schoolId: r.schoolId });
    }
  }
  return result;
}
