import { checkFeatureAccess } from "@/server/features/features.service";
import { getUserScopedRoles } from "@/server/auth/rbac";

/**
 * Returns true if user can manage users (roles, positions, classes) at the given school:
 * platform admin OR school admin with school:manage-school-user-roles at that school.
 */
export async function canManageSchoolUsers(
  userId: string,
  schoolId?: string
): Promise<boolean> {
  const hasAdminUsers = await checkFeatureAccess(userId, "/admin/users");
  if (hasAdminUsers) return true;
  if (schoolId) {
    const hasSchoolManage = await checkFeatureAccess(
      userId,
      "school:manage-school-user-roles",
      schoolId
    );
    if (hasSchoolManage) return true;
  }
  return false;
}

/**
 * Returns school IDs the user can manage, or null if platform admin (all schools).
 */
export async function getSchoolsUserCanManage(
  userId: string
): Promise<string[] | null> {
  const hasAdminUsers = await checkFeatureAccess(userId, "/admin/users");
  if (hasAdminUsers) return null;

  const scopedRoles = await getUserScopedRoles(userId);
  const schoolAdminSchoolIds = scopedRoles.school
    .filter((r) => r.roleKey === "SCHOOL_ADMIN")
    .map((r) => r.schoolId);

  const result: string[] = [];
  for (const sid of schoolAdminSchoolIds) {
    const hasAccess = await checkFeatureAccess(
      userId,
      "school:manage-school-user-roles",
      sid
    );
    if (hasAccess) result.push(sid);
  }
  return result;
}
