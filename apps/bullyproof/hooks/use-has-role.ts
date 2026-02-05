"use client";

import { useMemo } from "react";
import { useMeStore } from "@/entities/me/model/store";

/**
 * Hook to check if the current user has any of the required roles.
 * 
 * Reads directly from the me store - no API calls, fast and responsive.
 * Uses OR logic: returns true if user has ANY of the required roles.
 * 
 * @param requiredRoles - Array of role keys to check (e.g., ["PLATFORM_ADMIN", "TEACHER"])
 * @param schoolId - Optional school ID for school-specific role checks
 * @returns boolean indicating if user has at least one of the required roles
 * 
 * @example
 * ```tsx
 * const canAccess = useHasRole(["PLATFORM_ADMIN"]);
 * const canEdit = useHasRole(["TEACHER", "SCHOOL_ADMIN"], currentSchoolId);
 * ```
 */
export function useHasRole(
  requiredRoles: string[],
  schoolId?: string
): boolean {
  const currentUser = useMeStore((s) => s.currentUser);

  return useMemo(() => {
    // If no user or no roles required, return false
    if (!currentUser || !requiredRoles.length) {
      return false;
    }

    // Check platform roles first (faster lookup)
    const platformRoles = currentUser.platformRoles;
    if (Array.isArray(platformRoles)) {
      const hasPlatformRole = requiredRoles.some((role) =>
        platformRoles.includes(role)
      );
      if (hasPlatformRole) {
        return true;
      }
    }

    // Check school roles
    const schoolRoles = currentUser.schoolRoles;
    if (Array.isArray(schoolRoles) && schoolRoles.length > 0) {
      const relevantSchoolRoles = schoolId
        ? schoolRoles.filter((role) => role.schoolId === schoolId)
        : schoolRoles;

      const hasSchoolRole = relevantSchoolRoles.some((role) =>
        role.roleKey && requiredRoles.includes(role.roleKey)
      );

      if (hasSchoolRole) {
        return true;
      }
    }

    return false;
  }, [currentUser, requiredRoles, schoolId]);
}
