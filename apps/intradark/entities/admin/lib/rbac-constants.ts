/**
 * Platform superuser — implies every capability in app gates (`hasCapability`).
 * Assign only via migration / SQL / MCP (`user_roles`), not in-app UI.
 */
export const ROLE_DEVELOPER = "developer" as const;

/** Capability slug: staff sandbox simulators at /admin/sandbox. */
export const ROLE_SANDBOX_ACCESS = "sandbox.access" as const;

/** Capability slug: news authoring (future news routes). */
export const ROLE_NEWS_EDITOR = "news.editor" as const;

/** Any of these grants entry to `/admin` shell (per-route checks may still 404). */
export const ADMIN_AREA_SLUGS = [
  ROLE_SANDBOX_ACCESS,
  ROLE_NEWS_EDITOR,
] as const;

export type AdminAreaSlug = (typeof ADMIN_AREA_SLUGS)[number];
