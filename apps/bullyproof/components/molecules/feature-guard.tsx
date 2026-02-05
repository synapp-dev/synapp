"use client";

import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useCurrentUser } from "@/entities/me/api/getCurrentUser";
import { useSchoolStore } from "@/stores/school-store";

/**
 * FeatureGuard component
 *
 * Client-side guard that checks if the user has access to a feature.
 * This component no longer redirects - it simply performs the access check
 * and allows users with access to view the page.
 *
 * @example
 * ```tsx
 * // Platform-level feature
 * <FeatureGuard feature="admin" />
 *
 * // School-scoped feature
 * <FeatureGuard feature="lessons" schoolId={schoolId} />
 * ```
 */
export function FeatureGuard({
  feature,
  schoolId,
}: {
  feature: string;
  schoolId?: string;
}) {
  const { isLoading: isLoadingUser } = useCurrentUser();
  const currentSchool = useSchoolStore((s) => s.currentSchool);

  // Determine effective schoolId: platform-level features (admin panel and admin_* sections)
  // must not use school context; for others use prop > store
  const effectiveSchoolId =
    feature === "admin" || feature.startsWith("admin_")
      ? undefined
      : schoolId || currentSchool?.id;

  // Check feature access (no redirect, just validates access)
  const { hasAccess, isLoading: isLoadingFeature } = useFeatureAccess(
    feature,
    effectiveSchoolId
  );

  // Debug logging for lessons
  if (feature === "lessons") {
    console.log("[lessons] FeatureGuard:", {
      feature,
      schoolIdProp: schoolId,
      currentSchoolId: currentSchool?.id,
      effectiveSchoolId,
      hasAccess,
      isLoadingFeature,
      isLoadingUser,
    });
  }

  // No redirect - users with access can view the page
  return null;
}
