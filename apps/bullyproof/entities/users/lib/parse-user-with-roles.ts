import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";

export type RawUserProfileForParse = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  avatarUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  metadata?: UserWithRolesAndSchools["metadata"];
  platformRoles?: string[] | string | null;
  schoolRoles?: unknown;
};

function parsePlatformRoles(raw: string[] | string | null | undefined): string[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return raw
        .replace(/[{}"]/g, "")
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function parseSchoolRoles(raw: unknown): UserWithRolesAndSchools["schoolRoles"] {
  if (!raw) {
    return [];
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map(mapSchoolRoleEntry);
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) {
    return raw.map((entry) =>
      mapSchoolRoleEntry(entry as Record<string, unknown>)
    );
  }
  return [];
}

function mapSchoolRoleEntry(
  sr: Record<string, unknown>
): UserWithRolesAndSchools["schoolRoles"][number] {
  return {
    schoolId: String(sr.schoolId ?? ""),
    schoolName: sr.schoolName != null ? String(sr.schoolName) : null,
    roleKey: sr.roleKey != null ? String(sr.roleKey) : null,
    roleName: sr.roleName != null ? String(sr.roleName) : null,
  };
}

export function parseUserWithRoles(
  raw: RawUserProfileForParse
): UserWithRolesAndSchools {
  return {
    id: raw.id,
    firstName: raw.firstName ?? null,
    lastName: raw.lastName ?? null,
    email: raw.email,
    avatarUrl: raw.avatarUrl ?? null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
    metadata: raw.metadata ?? null,
    platformRoles: parsePlatformRoles(raw.platformRoles),
    schoolRoles: parseSchoolRoles(raw.schoolRoles),
    lastLoginAt: null,
  };
}
