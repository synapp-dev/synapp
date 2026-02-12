"use client";

import { useFeatureAccess } from "./use-feature-access";

/**
 * Returns true when the user can edit school roles at the given school.
 * True if user has any of:
 * - school:manage-school-user-roles (SCHOOL_ADMIN at their school)
 * - system:manage-user-roles (PLATFORM_ADMIN / INTRADARK_DEV)
 * - /admin/features (feature-level access to manage roles)
 */
export function useCanEditSchoolRoles(schoolId: string | undefined) {
  const schoolManage = useFeatureAccess(
    "school:manage-school-user-roles",
    schoolId
  );
  const systemManage = useFeatureAccess("system:manage-user-roles");
  const adminFeatures = useFeatureAccess("/admin/features");

  return {
    canEdit:
      schoolManage.hasAccess ||
      systemManage.hasAccess ||
      adminFeatures.hasAccess,
    isLoading:
      schoolManage.isLoading ||
      systemManage.isLoading ||
      adminFeatures.isLoading,
  };
}
