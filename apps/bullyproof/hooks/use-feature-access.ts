"use client";

import { useMemo } from "react";
import { useMeStore } from "@/entities/me/model/store";
import { useCurrentUser } from "@/entities/me/api/getCurrentUser";
import { checkFeatureAccessAndVisibleCached } from "@/utils/check-feature-access-cached";

/**
 * Hook to check if the current user has access to a feature and whether it is visible in nav.
 *
 * @param featureKey - The feature key to check (e.g., "/school/lessons", "/admin/content", "/admin")
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
  const effectiveUser = useMeStore((s) => s.viewAsUser ?? s.currentUser);
  const { isLoading: isLoadingUser, isError: isErrorUser, error: userError } = useCurrentUser();

  const { hasAccess, visible } = useMemo(() => {
    if (!effectiveUser || !featureKey) {
      return { hasAccess: false, visible: false };
    }
    // Platform-level features (/admin*, system:*, admin:*) never use school context
    const effectiveSchoolId =
      featureKey.startsWith("/admin") ||
      featureKey.startsWith("system:") ||
      featureKey.startsWith("admin:")
        ? undefined
        : schoolId;
    return checkFeatureAccessAndVisibleCached(
      effectiveUser.featurePermissions,
      featureKey,
      effectiveSchoolId,
      effectiveUser.roleIds
    );
  }, [effectiveUser?.featurePermissions, featureKey, schoolId, effectiveUser?.roleIds]);

  return {
    hasAccess,
    visible,
    isLoading: isLoadingUser,
    isError: isErrorUser,
    error: userError as Error | null,
  };
}
