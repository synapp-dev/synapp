/**
 * Feature key constants for access control.
 * Organized by category to keep things discoverable and avoid typos.
 *
 * Key naming convention (delimiters encode the type):
 *
 * - Leading `/` = page/route  e.g., `/dashboard`, `/admin/users`, `/school/lessons`
 * - `:` (colon) = action       e.g., `admin:delete-user`, `school:create-lesson`
 * - `.` (dot)   = component    e.g., `/admin/users.edit-button`
 * - `system:`   = system       e.g., `system:maintenance`
 *
 * School-scoped pages use `/school/` prefix.
 * Words within segments use kebab-case.
 */

// ─── System Features ─────────────────────────────────────────────────────────

export const MAINTENANCE_FEATURE_KEY = "system:maintenance";

/** Role key for users who bypass maintenance when it is enabled globally. */
export const MAINTENANCE_BYPASS_ROLE_KEY = "INTRADARK_DEV";

// ─── Page Features ───────────────────────────────────────────────────────────

/** Page feature keys (category: "page") */
export const PAGE_FEATURES = {
  // Main navigation pages
  DASHBOARD: "/dashboard",
  WELCOME: "/welcome",
  SUPPORT: "/support",
  SETTINGS: "/settings",
  AP_CERTIFICATION: "/ap-certification",

  // School-scoped pages
  HOME: "/school/home",
  LESSONS: "/school/lessons",
  CONTENT: "/school/content",
  RESOURCES: "/school/resources",
  TEACHERS: "/school/teachers",
  CLASSES: "/school/classes",
  PERFORMANCE: "/school/performance",
  REPORTS: "/school/reports",

  // Admin pages
  ADMIN: "/admin",
  ADMIN_CONTENT: "/admin/content",
  ADMIN_SCHOOLS: "/admin/schools",
  ADMIN_USERS: "/admin/users",
  ADMIN_FEATURES: "/admin/features",
  ADMIN_CLASSES: "/admin/classes",
  ADMIN_LESSONS: "/admin/lessons",
  ADMIN_CULTURE_RATINGS: "/admin/culture-ratings",
  ADMIN_AUDIT_LOGS: "/admin/audit-logs",
  ADMIN_SUPPORT_TOOLS: "/admin/support-tools",
} as const;

// ─── System Features (expanded) ─────────────────────────────────────────────

/** System feature keys (category: "system") */
export const SYSTEM_FEATURES = {
  MAINTENANCE: MAINTENANCE_FEATURE_KEY,
  ADMIN_ACCESS: "system:admin-access",
  TEACHER_ACCESS: "system:teacher-access",
  SCHOOL_ADMIN_ACCESS: "system:school-admin-access",
} as const;

// ─── Component Features ──────────────────────────────────────────────────────

/** Component feature keys (category: "component") - add as needed */
export const COMPONENT_FEATURES = {
  // Example: ADMIN_EDIT_USER_BUTTON: "/admin/users.edit-button",
} as const;

// ─── Action Features ─────────────────────────────────────────────────────────

/** Action feature keys (category: "action") - add as needed */
export const ACTION_FEATURES = {
  // Example: ADMIN_DELETE_USER: "admin:delete-user",
} as const;

// ─── Valid Categories ────────────────────────────────────────────────────────

export const FEATURE_CATEGORIES = ["page", "component", "action", "system"] as const;
export type FeatureCategory = (typeof FEATURE_CATEGORIES)[number];
