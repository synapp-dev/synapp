"use client";

import * as React from "react";
import { useHasRole } from "@/hooks/use-has-role";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { cn } from "@workspace/ui/lib/utils";

export interface RoleGuardProps {
  /**
   * Array of role keys to check (e.g., ["PLATFORM_ADMIN", "TEACHER"])
   * User needs ANY of these roles to access the content
   * If feature is also provided, both role AND feature access must pass
   */
  roles?: string[];
  
  /**
   * Feature key to check (e.g., "lessons", "content", "admin")
   * If provided, checks feature access using hierarchical permission system
   * Can be used alone or in combination with roles
   */
  feature?: string;
  
  /**
   * Optional school ID for school-specific role/feature checks
   * When provided, only school roles/features for this school will be checked
   */
  schoolId?: string;
  
  /**
   * Controls how the component behaves when user doesn't have required access
   * - "hide": Component is not rendered (returns null)
   * - "disable": Component is rendered but disabled (pointer-events-none, reduced opacity)
   */
  mode?: "hide" | "disable";
  
  /**
   * Content to wrap and control access to
   */
  children: React.ReactNode;
  
  /**
   * Optional content to show when access is denied (only used in "hide" mode)
   */
  fallback?: React.ReactNode;
  
  /**
   * Additional className for the disabled wrapper (only used in "disable" mode)
   */
  className?: string;
}

/**
 * RoleGuard component
 * 
 * A reusable wrapper that controls access to components based on user roles and/or features.
 * Supports both role-based and feature-based access control, with feature access using
 * hierarchical permission resolution (user > school > role > global).
 * 
 * Logic:
 * - If feature prop provided: Check feature access directly
 * - If roles prop provided: Check if user has any of the specified roles
 * - If both provided: Both must pass (AND logic)
 * - Feature access uses hierarchical resolution (user > school > role > global)
 * 
 * @example
 * ```tsx
 * // Hide component if user doesn't have role
 * <RoleGuard roles={["PLATFORM_ADMIN"]}>
 *   <AdminIcon />
 * </RoleGuard>
 * 
 * // Check feature access
 * <RoleGuard feature="lessons" schoolId={currentSchoolId}>
 *   <LessonsPage />
 * </RoleGuard>
 * 
 * // Both role and feature must pass
 * <RoleGuard roles={["TEACHER"]} feature="lessons" schoolId={currentSchoolId}>
 *   <EditButton />
 * </RoleGuard>
 * 
 * // Multiple roles (user needs ANY of them)
 * <RoleGuard roles={["PLATFORM_ADMIN", "SCHOOL_ADMIN"]}>
 *   <SettingsPanel />
 * </RoleGuard>
 * ```
 */
export function RoleGuard({
  roles,
  feature,
  schoolId,
  mode = "hide",
  children,
  fallback = null,
  className,
}: RoleGuardProps) {
  // Check role access if roles prop provided
  const hasRole = roles ? useHasRole(roles, schoolId) : true;
  
  // Check feature access if feature prop provided
  const { hasAccess: hasFeatureAccess, isLoading: isLoadingFeature } = useFeatureAccess(
    feature || "",
    schoolId
  );
  const hasFeature = feature ? hasFeatureAccess : true;

  // Both checks must pass (AND logic)
  // If feature is loading, default to false to prevent flash of content
  const hasAccess = hasRole && (feature ? (!isLoadingFeature && hasFeature) : true);

  // Hide mode: don't render if user doesn't have access
  if (mode === "hide") {
    if (!hasAccess) {
      return <>{fallback}</>;
    }
    return <>{children}</>;
  }

  // Disable mode: always render but disable if user doesn't have access
  return (
    <div
      className={cn(
        !hasAccess && [
          "pointer-events-none",
          "opacity-50",
          "cursor-not-allowed",
          "select-none",
        ],
        className
      )}
      aria-disabled={!hasAccess}
    >
      {children}
    </div>
  );
}
