import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import type { School } from "@/entities/school/model/useListSchoolsQuery";

// Helper function to extract school metadata (state, sector, levels)
export function extractSchoolMetadata(school: School | null) {
  if (!school) {
    return { stateText: "", sectorText: "", levelsText: "" };
  }

  const st = (school as any)?.state;
  const stateText = st
    ? typeof st === "string"
      ? st.toUpperCase()
      : (st as any)?.code?.toUpperCase() || ""
    : "";

  // Handle sector: can be string (vSchoolsReadable) or object (vSchoolsEnriched)
  const sector = (school as any)?.sector;
  const sectorText =
    typeof sector === "string"
      ? sector
      : sector && typeof sector === "object"
        ? (sector as any)?.name || ""
        : "";

  // Handle levels: can be string[] (vSchoolsReadable) or object[] (vSchoolsEnriched)
  const lvls = (school as any)?.levels;
  let levelsText = "";
  if (Array.isArray(lvls) && lvls.length > 0) {
    // Extract names if objects, or use strings directly
    const levelNames = lvls.map((lvl) =>
      typeof lvl === "string"
        ? lvl
        : (lvl as any)?.name || (lvl as any)?.key || ""
    );
    const lower = levelNames.map((s) => s.toLowerCase());
    const hasPrimary = lower.some((s) => s.includes("primary"));
    const hasSecondary = lower.some((s) => s.includes("secondary"));
    if (hasPrimary && hasSecondary) levelsText = "P-12";
    else if (hasPrimary) levelsText = "Primary";
    else if (hasSecondary) levelsText = "Secondary";
    else levelsText = levelNames.join(", ");
  }

  return { stateText, sectorText, levelsText };
}

export const getInitials = (firstName: string | null, lastName: string | null) => {
  const first = firstName?.[0]?.toUpperCase() || "";
  const last = lastName?.[0]?.toUpperCase() || "";
  return first + last || "?";
};

export const getFullName = (user: UserWithRolesAndSchools | null) => {
  if (!user) return "Unknown User";
  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : user.email || "Unknown User";
};

export const isSchoolLicenceAccount = (user: UserWithRolesAndSchools | null) => {
  if (!user || !user.schoolRoles) return false;
  return user.schoolRoles.some((sr) => sr.roleKey === "SCHOOL_LICENCE");
};

export const getDisplayName = (user: UserWithRolesAndSchools | null) => {
  if (!user) return "Unknown User";
  if (isSchoolLicenceAccount(user)) {
    const licenceSchoolRole = user.schoolRoles?.find(
      (sr) => sr.roleKey === "SCHOOL_LICENCE"
    );
    const schoolName = licenceSchoolRole?.schoolName || "Unknown School";
    return `${schoolName} (LICENCE)`;
  }
  return getFullName(user);
};

export const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Platform role keys (standard platform roles; matches rolesRepo.isPlatformRole)
export const PLATFORM_ROLE_KEYS: string[] = [
  "PLATFORM_ADMIN",
  "GOVERNMENT_VIEWER",
  "PLATFORM_STAFF",
];

/**
 * Target can receive a standard platform role via assignRole (no schoolId):
 * no school roles and no platform roles at all (including INTRADARK_DEV).
 */
export function canTargetReceiveFirstPlatformRole(
  user: UserWithRolesAndSchools | null
): boolean {
  if (!user) return false;
  if ((user.schoolRoles?.length ?? 0) > 0) return false;
  if ((user.platformRoles?.length ?? 0) > 0) return false;
  return true;
}
