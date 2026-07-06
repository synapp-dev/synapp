"use client";

import { useMemo } from "react";
import { PAGE_FEATURES } from "@/lib/feature-keys";
import {
  isAdminRestrictedForLessonCreate,
  normalizePlatformRoles,
} from "@/lib/lesson-access-policy";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useMeStore } from "@/entities/me/model/store";

/**
 * Client-side lesson access signals derived from cached feature permissions
 * and platform roles on the current user.
 */
export function useLessonAccess(schoolId?: string) {
  const effectiveUser = useMeStore((s) => s.viewAsUser ?? s.currentUser);

  const { hasAccess: hasAdminLessons, isLoading: isLoadingAdminLessons } =
    useFeatureAccess(PAGE_FEATURES.ADMIN_LESSONS);
  const { hasAccess: hasSchoolLessons, isLoading: isLoadingSchoolLessons } =
    useFeatureAccess(PAGE_FEATURES.LESSONS, schoolId);

  const isAdminRestrictedForCreate = useMemo(() => {
    const roles = normalizePlatformRoles(effectiveUser?.platformRoles);
    return isAdminRestrictedForLessonCreate(roles);
  }, [effectiveUser?.platformRoles]);

  const canAccessLessons =
    hasAdminLessons || (!!schoolId && hasSchoolLessons);

  const isLoading = isLoadingAdminLessons || isLoadingSchoolLessons;

  return {
    hasAdminLessons,
    hasSchoolLessons,
    canAccessLessons,
    isAdminRestrictedForCreate,
    /** @deprecated alias — use isAdminRestrictedForCreate */
    isAdminRestricted: isAdminRestrictedForCreate,
    isLoading,
  };
}
