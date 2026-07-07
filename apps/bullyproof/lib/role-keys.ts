/**
 * The role catalog: the single module that owns role-key knowledge.
 *
 * Every membership group, scope split, and display priority lives here so the
 * lists cannot drift apart in separate files. Consumers ask this module;
 * they do not restate role keys. Where two groups intentionally differ, the
 * difference is documented on the group itself.
 */

export const ROLE_KEYS = {
  INTRADARK_DEV: "INTRADARK_DEV",
  PLATFORM_ADMIN: "PLATFORM_ADMIN",
  PLATFORM_MODERATOR: "PLATFORM_MODERATOR",
  PLATFORM_STAFF: "PLATFORM_STAFF",
  GOVERNMENT_VIEWER: "GOVERNMENT_VIEWER",
  SCHOOL_ADMIN: "SCHOOL_ADMIN",
  TEACHER: "TEACHER",
  SCHOOL_STAFF: "SCHOOL_STAFF",
  SCHOOL_LICENCE: "SCHOOL_LICENCE",
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

/**
 * All platform-scoped role keys (user_roles.school_id IS NULL). This is the
 * "grants admin panel access" set; rbac re-exports it as
 * ALL_PLATFORM_ADMIN_KEYS for server callers.
 */
export const PLATFORM_ROLE_KEYS = [
  ROLE_KEYS.INTRADARK_DEV,
  ROLE_KEYS.PLATFORM_ADMIN,
  ROLE_KEYS.PLATFORM_MODERATOR,
  ROLE_KEYS.PLATFORM_STAFF,
  ROLE_KEYS.GOVERNMENT_VIEWER,
] as const;

/** All school-scoped role keys (user_roles.school_id NOT NULL). */
export const SCHOOL_ROLE_KEYS = [
  ROLE_KEYS.SCHOOL_ADMIN,
  ROLE_KEYS.TEACHER,
  ROLE_KEYS.SCHOOL_STAFF,
  ROLE_KEYS.SCHOOL_LICENCE,
] as const;

/**
 * Bullyproof staff platform roles (excludes GOVERNMENT_VIEWER, an external
 * stakeholder). Gates internal power-user tooling like the Ctrl+K command
 * menu: school-scoped users never see it.
 */
export const BULLYPROOF_PLATFORM_ROLE_KEYS = [
  ROLE_KEYS.INTRADARK_DEV,
  ROLE_KEYS.PLATFORM_ADMIN,
  ROLE_KEYS.PLATFORM_MODERATOR,
  ROLE_KEYS.PLATFORM_STAFF,
] as const;

/**
 * Platform roles that cannot create lessons in their own name.
 * Must select a school user to create on behalf of.
 */
export const ADMIN_CANNOT_CREATE_LESSON_KEYS = [
  ROLE_KEYS.INTRADARK_DEV,
  ROLE_KEYS.PLATFORM_ADMIN,
  ROLE_KEYS.PLATFORM_MODERATOR,
  ROLE_KEYS.PLATFORM_STAFF,
] as const;

/**
 * Historic subset used by role-assignment exclusivity checks in
 * server/roles/roles.repo.ts. It predates this catalog and deliberately
 * preserves existing behaviour: INTRADARK_DEV and PLATFORM_MODERATOR are not
 * listed, so accounts holding them are not blocked from also carrying school
 * roles (internal/dev accounts use this for testing). Widening this to
 * PLATFORM_ROLE_KEYS would change assignment validation behaviour; do that
 * deliberately, not as a tidy-up.
 */
export const ROLE_EXCLUSIVITY_PLATFORM_KEYS = [
  ROLE_KEYS.PLATFORM_ADMIN,
  ROLE_KEYS.GOVERNMENT_VIEWER,
  ROLE_KEYS.PLATFORM_STAFF,
] as const;

/**
 * One total display order across every role. Lower ranks first. School roles
 * outrank platform roles for badge purposes; platform roles keep their
 * internal seniority (INTRADARK_DEV first, GOVERNMENT_VIEWER last). Role
 * exclusivity means a single user never mixes the two scopes, so the cross
 * scope ordering is only ever visible in role-definition lists.
 */
export const ROLE_PRIORITY: Record<RoleKey, number> = {
  SCHOOL_ADMIN: 1,
  TEACHER: 2,
  SCHOOL_STAFF: 3,
  SCHOOL_LICENCE: 4,
  INTRADARK_DEV: 5,
  PLATFORM_ADMIN: 6,
  PLATFORM_MODERATOR: 7,
  PLATFORM_STAFF: 8,
  GOVERNMENT_VIEWER: 9,
};

/** Unknown keys sort last. */
export function getRolePriority(roleKey?: string | null): number {
  if (!roleKey) return Number.MAX_SAFE_INTEGER;
  return ROLE_PRIORITY[roleKey as RoleKey] ?? Number.MAX_SAFE_INTEGER;
}

export function isPlatformRoleKey(roleKey?: string | null): boolean {
  return (PLATFORM_ROLE_KEYS as readonly string[]).includes(roleKey ?? "");
}

export function isSchoolRoleKey(roleKey?: string | null): boolean {
  return (SCHOOL_ROLE_KEYS as readonly string[]).includes(roleKey ?? "");
}

type RoleLike = {
  key?: string | null;
  name?: string | null;
};

/** Sort role records by catalog priority, then name. */
export function sortPlatformRoles<T extends RoleLike>(roles: T[]): T[] {
  return [...roles].sort((a, b) => {
    const rankA = getRolePriority(a.key);
    const rankB = getRolePriority(b.key);
    if (rankA !== rankB) return rankA - rankB;

    const nameA = (a.name ?? a.key ?? "").toLowerCase();
    const nameB = (b.name ?? b.key ?? "").toLowerCase();
    return nameA.localeCompare(nameB);
  });
}
