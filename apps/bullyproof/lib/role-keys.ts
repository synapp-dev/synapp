/**
 * Platform roles that cannot create lessons in their own name.
 * Must select a school user to create on behalf of.
 */
export const ADMIN_CANNOT_CREATE_LESSON_KEYS = [
  "INTRADARK_DEV",
  "PLATFORM_ADMIN",
  "PLATFORM_MODERATOR",
  "PLATFORM_STAFF",
] as const;

/**
 * Bullyproof staff platform roles (excludes GOVERNMENT_VIEWER, an external
 * stakeholder). Gates internal power-user tooling like the Ctrl+K command
 * menu: school-scoped users never see it.
 */
export const BULLYPROOF_PLATFORM_ROLE_KEYS = [
  "INTRADARK_DEV",
  "PLATFORM_ADMIN",
  "PLATFORM_MODERATOR",
  "PLATFORM_STAFF",
] as const;
