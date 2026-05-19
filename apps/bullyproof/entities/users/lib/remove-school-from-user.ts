import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";

/** Removes all school role rows for the given school from a user snapshot. */
export function removeSchoolRolesFromUser(
  user: UserWithRolesAndSchools,
  schoolId: string
): UserWithRolesAndSchools {
  return {
    ...user,
    schoolRoles: user.schoolRoles.filter((sr) => sr.schoolId !== schoolId),
  };
}
