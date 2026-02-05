"use client";

import { useMemo } from "react";
import { useMeStore } from "@/entities/me/model/store";
import { useCurrentUser } from "@/entities/me/api/getCurrentUser";
import { checkFeatureAccessAndVisibleCached } from "@/utils/check-feature-access-cached";

/**
 * Hook to check if the current user has access to a feature and whether it is visible in nav.
 *
 * @param featureKey - The feature key to check (e.g., "lessons", "content", "admin")
 * @param schoolId - Optional school ID for school-specific feature checks
 * @returns Object with hasAccess, visible, isLoading, and error states
 */
export function useFeatureAccess(
  featureKey: string,
  schoolId?: string
): {
  hasAccess: boolean;
  visible: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} {
  const currentUser = useMeStore((s) => s.currentUser);
  const { isLoading: isLoadingUser, isError: isErrorUser, error: userError } = useCurrentUser();

  const { hasAccess, visible } = useMemo(() => {
    if (!currentUser || !featureKey) {
      return { hasAccess: false, visible: false };
    }
    // Admin panel and admin section features are platform-level; never use school context
    const effectiveSchoolId =
      featureKey === "admin" || featureKey.startsWith("admin_")
        ? undefined
        : schoolId;
    return checkFeatureAccessAndVisibleCached(
      currentUser.featurePermissions,
      featureKey,
      effectiveSchoolId,
      currentUser.roleIds
    );
  }, [currentUser?.featurePermissions, featureKey, schoolId, currentUser?.roleIds]);

  return {
    hasAccess,
    visible,
    isLoading: isLoadingUser,
    isError: isErrorUser,
    error: userError as Error | null,
  };
}
