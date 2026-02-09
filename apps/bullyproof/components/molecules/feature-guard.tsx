"use client";

import * as React from "react";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useCurrentUser } from "@/entities/me/api/getCurrentUser";
import { useSchoolStore } from "@/stores/school-store";
import { cn } from "@workspace/ui/lib/utils";

/**
 * FeatureGuard component
 *
 * Client-side guard that checks if the user has access to a feature.
 *
 * When used **without children** (legacy mode), it simply performs the access check
 * and returns null. Existing call-sites that render `<FeatureGuard feature="x" />`
 * as a standalone element continue to work as before.
 *
 * When used **with children** (new mode), it controls visibility and interactivity:
 * - `enabled` + `visible` -> renders children normally (full access)
 * - `visible` but not `enabled` -> renders children disabled (pointer-events-none, reduced opacity)
 * - not `visible` -> hides children entirely (renders fallback or nothing)
 *
 * @example
 * ```tsx
 * // Legacy: standalone access check (returns null)
 * <FeatureGuard feature="/admin" />
 *
 * // New: wrap a page
 * <FeatureGuard feature="/dashboard" schoolId={schoolId}>
 *   <DashboardContent />
 * </FeatureGuard>
 *
 * // New: wrap a button (disabled when no access)
 * <FeatureGuard feature="/admin/users.edit-button">
 *   <Button onClick={handleEdit}>Edit User</Button>
 * </FeatureGuard>
 *
 * // New: with fallback
 * <FeatureGuard feature="/school/reports" fallback={<UpgradeBanner />}>
 *   <ReportsPanel />
 * </FeatureGuard>
 * ```
 */
export function FeatureGuard({
  feature,
  schoolId,
  children,
  fallback,
  className,
}: {
  /** Feature key, e.g. "/admin", "/dashboard", "/admin/users.edit-button" */
  feature: string;
  /** Optional school context for school-scoped features */
  schoolId?: string;
  /** Content to wrap and guard. If omitted, component returns null (legacy mode). */
  children?: React.ReactNode;
  /** Content shown when feature is not visible (only used when children are provided). */
  fallback?: React.ReactNode;
  /** Additional className for the disabled wrapper (only in wrapping mode). */
  className?: string;
}) {
  const { isLoading: isLoadingUser } = useCurrentUser();
  const currentSchool = useSchoolStore((s) => s.currentSchool);

  // Platform-level features (/admin*, system:*) must not use school context
  const effectiveSchoolId =
    feature.startsWith("/admin") || feature.startsWith("system:")
      ? undefined
      : schoolId || currentSchool?.id;

  const { hasAccess, visible, isLoading: isLoadingFeature } = useFeatureAccess(
    feature,
    effectiveSchoolId
  );

  // ------------------------------------------------------------------
  // Legacy mode: no children -> just perform the check, return nothing
  // ------------------------------------------------------------------
  if (children === undefined) {
    return null;
  }

  // ------------------------------------------------------------------
  // Wrapping mode: control children visibility / interactivity
  // ------------------------------------------------------------------

  // While loading, render nothing to prevent content flash
  if (isLoadingUser || isLoadingFeature) {
    return null;
  }

  // Not visible at all -> hide completely (show fallback if provided)
  if (!visible) {
    return <>{fallback ?? null}</>;
  }

  // Visible but not enabled -> render disabled
  if (!hasAccess) {
    return (
      <div
        className={cn(
          "pointer-events-none opacity-50 cursor-not-allowed select-none",
          className
        )}
        aria-disabled="true"
      >
        {children}
      </div>
    );
  }

  // Full access -> render normally
  return <>{children}</>;
}
