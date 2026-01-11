import { useMemo } from "react";
import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import type { Role } from "./types";
import { PLATFORM_ROLE_KEYS } from "./utils";

export function useRoleManagement(user: UserWithRolesAndSchools | null, roles: Role[], selectedSchoolId?: string) {
  // Check if user has any platform role
  const userHasPlatformRole = useMemo(
    () =>
      user?.platformRoles?.some((key) => PLATFORM_ROLE_KEYS.includes(key)) ??
      false,
    [user?.platformRoles]
  );

  // Check if user has any school role
  const userHasSchoolRole = useMemo(
    () => (user?.schoolRoles?.length ?? 0) > 0,
    [user?.schoolRoles?.length]
  );

  // Check if user has SCHOOL_LICENCE role
  const userHasSchoolLicence = useMemo(
    () =>
      user?.schoolRoles?.some((sr) => sr.roleKey === "SCHOOL_LICENCE") ?? false,
    [user?.schoolRoles]
  );

  // Check if user has any non-SCHOOL_LICENCE school roles
  const userHasNonLicenceSchoolRole = useMemo(
    () =>
      user?.schoolRoles?.some((sr) => sr.roleKey !== "SCHOOL_LICENCE") ??
      false,
    [user?.schoolRoles]
  );

  // Get all roles with availability status
  const getAllRolesWithStatus = () => {
    if (!user) return [];

    // Platform roles the user already has
    const userPlatformRoleKeys = new Set(user.platformRoles || []);

    // School roles the user already has at the selected school (if school is selected)
    const userSchoolRoleKeysAtSelectedSchool = selectedSchoolId
      ? new Set(
          (user.schoolRoles || [])
            .filter((sr) => sr.schoolId === selectedSchoolId)
            .map((sr) => sr.roleKey || "")
            .filter(Boolean)
        )
      : new Set<string>();

    // Check if role is a platform role
    const isPlatformRole = (roleKey: string) =>
      PLATFORM_ROLE_KEYS.includes(roleKey);

    // Check if role is a school role
    const isSchoolRole = (roleKey: string) =>
      roleKey.includes("SCHOOL") || roleKey.includes("TEACHER");

    return roles.map((role) => {
      const roleKey = role.key || "";
      const isAssigningPlatformRole = isPlatformRole(roleKey);
      const isAssigningSchoolRole = isSchoolRole(roleKey);

      let isAvailable = true;
      let reason = "";

      // If user has platform role, they can only have that one role
      if (userHasPlatformRole) {
        // Only allow the platform role they already have
        isAvailable = userPlatformRoleKeys.has(roleKey);
        if (!isAvailable) {
          reason = "User already has a platform role";
        }
      } else {
        // If user has school roles, they cannot have platform roles
        if (userHasSchoolRole && isAssigningPlatformRole) {
          isAvailable = false;
          reason = "User has school roles";
        }

        // If assigning platform role and user has any roles, prevent it
        if (
          isAssigningPlatformRole &&
          (userHasPlatformRole || userHasSchoolRole)
        ) {
          isAvailable = false;
          reason = "User already has roles";
        }

        // For platform roles, filter out if user already has it
        if (isAssigningPlatformRole && userPlatformRoleKeys.has(roleKey)) {
          isAvailable = false;
          reason = "User already has this role";
        }

        // For school roles, check SCHOOL_LICENCE exclusivity
        if (isAssigningSchoolRole) {
          const isSchoolLicenceRole = roleKey === "SCHOOL_LICENCE";

          // If user has SCHOOL_LICENCE, they cannot have other school roles
          if (userHasSchoolLicence && !isSchoolLicenceRole) {
            isAvailable = false;
            reason = "User has SCHOOL_LICENCE";
          }

          // If user has other school roles, they cannot have SCHOOL_LICENCE
          if (userHasNonLicenceSchoolRole && isSchoolLicenceRole) {
            isAvailable = false;
            reason = "User has other school roles";
          }

          // If a school is selected, filter out roles the user already has at that school
          if (
            selectedSchoolId &&
            userSchoolRoleKeysAtSelectedSchool.has(roleKey)
          ) {
            isAvailable = false;
            reason = "User already has this role at this school";
          }
        }
      }

      return {
        role,
        isAvailable,
        reason,
      };
    });
  };

  // Get available roles that the user doesn't already have (for filtering)
  const getAvailableRoles = () => {
    return getAllRolesWithStatus()
      .filter((item) => item.isAvailable)
      .map((item) => item.role);
  };

  return {
    userHasPlatformRole,
    userHasSchoolRole,
    userHasSchoolLicence,
    userHasNonLicenceSchoolRole,
    getAllRolesWithStatus,
    getAvailableRoles,
  };
}
