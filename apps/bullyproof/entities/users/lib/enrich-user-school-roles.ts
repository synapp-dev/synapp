import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";

export type SchoolRoleCatalogEntry = {
  id: string;
  name: string;
};

export type RoleCatalogEntry = {
  key: string | null;
  name: string | null;
};

/** Fill missing schoolName / roleName using directory data or a prior snapshot. */
export function enrichUserSchoolRoles(
  user: UserWithRolesAndSchools,
  options?: {
    schools?: SchoolRoleCatalogEntry[];
    roles?: RoleCatalogEntry[];
    previousSchoolRoles?: UserWithRolesAndSchools["schoolRoles"];
  }
): UserWithRolesAndSchools {
  const schoolNameById = new Map(
    (options?.schools ?? []).map((s) => [s.id, s.name])
  );
  const roleNameByKey = new Map(
    (options?.roles ?? [])
      .filter((r) => r.key)
      .map((r) => [r.key as string, r.name])
  );
  const previousByComposite = new Map(
    (options?.previousSchoolRoles ?? []).map((sr) => [
      `${sr.schoolId}:${sr.roleKey ?? ""}`,
      sr,
    ])
  );

  const schoolRoles = user.schoolRoles.map((sr) => {
    const prev = previousByComposite.get(`${sr.schoolId}:${sr.roleKey ?? ""}`);
    const schoolName =
      sr.schoolName ||
      prev?.schoolName ||
      schoolNameById.get(sr.schoolId) ||
      null;
    const roleName =
      sr.roleName ||
      prev?.roleName ||
      (sr.roleKey ? roleNameByKey.get(sr.roleKey) ?? null : null) ||
      null;

    return {
      ...sr,
      schoolName,
      roleName,
    };
  });

  return { ...user, schoolRoles };
}
