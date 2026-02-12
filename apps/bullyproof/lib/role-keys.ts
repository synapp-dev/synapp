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
