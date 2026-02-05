"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useCurrentUser } from "@/entities/me/api/getCurrentUser";
import { useMeStore } from "@/entities/me/model/store";
import { useSchoolStore } from "@/stores/school-store";

/**
 * FeatureGuard component
 *
 * Client-side guard that checks if the user has access to a feature
 * and redirects to /dashboard if they do not.
 *
 * This ensures that only users with the required feature permission
 * can access protected routes.
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
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading: isLoadingUser } = useCurrentUser();
  const currentUser = useMeStore((s) => s.currentUser);
  const currentSchool = useSchoolStore((s) => s.currentSchool);

  // Determine effective schoolId: platform-level features (admin panel and admin_* sections)
  // must not use school context; for others use prop > store
  const effectiveSchoolId =
    feature === "admin" || feature.startsWith("admin_")
      ? undefined
      : schoolId || currentSchool?.id;

  // Check feature access
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

  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Don't check on public routes or while loading
    const isPublicRoute =
      pathname.startsWith("/api") ||
      pathname.startsWith("/auth") ||
      pathname === "/logout";

    if (isPublicRoute || isLoadingUser || isLoadingFeature) {
      return;
    }

    // Don't redirect until store has current user (permissions settled after query completes)
    if (currentUser === null) {
      return;
    }

    // Mark that we've completed the check
    if (!hasChecked) {
      setHasChecked(true);
    }

    // If user doesn't have access, redirect to dashboard
    if (!hasAccess) {
      router.replace("/dashboard");
    }
  }, [
    hasAccess,
    pathname,
    router,
    isLoadingUser,
    isLoadingFeature,
    currentUser,
    hasChecked,
  ]);

  return null;
}
