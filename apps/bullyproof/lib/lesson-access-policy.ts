import { ADMIN_CANNOT_CREATE_LESSON_KEYS } from "@/lib/role-keys";

export type SchoolMembership = {
  schoolId: string;
  roleKey?: string;
};

export type LessonOwnerRef = {
  status: string;
  createdByUserId: string | null;
};

/** Normalize platformRoles from DB (array or PostgreSQL array string). */
export function normalizePlatformRoles(platformRoles: unknown): string[] {
  if (Array.isArray(platformRoles)) {
    return platformRoles.filter((r): r is string => typeof r === "string");
  }
  if (typeof platformRoles === "string") {
    const trimmed = platformRoles.replace(/^\{|\}$/g, "").trim();
    if (!trimmed) return [];
    return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function normalizeSchoolId(schoolId: string): string {
  return schoolId.toLowerCase().trim();
}

export function hasSchoolMembership(
  memberships: SchoolMembership[],
  schoolId: string
): boolean {
  const normalized = normalizeSchoolId(schoolId);
  return memberships.some(
    (m) => m.schoolId && normalizeSchoolId(m.schoolId) === normalized
  );
}

export function isTeacherAtAnySchool(
  memberships: SchoolMembership[]
): boolean {
  return memberships.some((m) => m.roleKey === "TEACHER");
}

/** Platform admins must create lessons on behalf of a school user. */
export function isAdminRestrictedForLessonCreate(
  platformRoleKeys: string[]
): boolean {
  return platformRoleKeys.some((key) =>
    ADMIN_CANNOT_CREATE_LESSON_KEYS.includes(
      key as (typeof ADMIN_CANNOT_CREATE_LESSON_KEYS)[number]
    )
  );
}

/**
 * Feedback-status lessons only block the owner in recommendation conflict lists.
 */
export function shouldIncludeLessonInActiveConflicts(
  lesson: LessonOwnerRef,
  viewerUserId: string
): boolean {
  if (lesson.status === "feedback" && lesson.createdByUserId !== viewerUserId) {
    return false;
  }
  return true;
}
