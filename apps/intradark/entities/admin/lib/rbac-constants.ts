/**
 * Platform superuser — implies every capability in app gates (`hasCapability`).
 * Assign only via migration / SQL / MCP (`user_roles`), not in-app UI.
 */
export const ROLE_DEVELOPER = "developer" as const;

/**
 * Capability slug: early-access gate. While the platform is in stealth/blackout,
 * only principals whose effective slugs include this (or `developer`) may see
 * anything beyond the public `/coming-soon` page. Enforced in `middleware.ts`.
 */
export const ROLE_SITE_ACCESS = "site.access" as const;

/** Capability slug: staff sandbox simulators at /admin/sandbox. */
export const ROLE_SANDBOX_ACCESS = "sandbox.access" as const;

/** Capability slug: news authoring (future news routes). */
export const ROLE_NEWS_EDITOR = "news.editor" as const;

/** Capability slug: review/publish community utility lineups at /admin/utility. */
export const ROLE_UTILITY_EDITOR = "utility.editor" as const;

/** Capability slug: platform-wide tournament organizer at /admin/tournaments. */
export const ROLE_TOURNAMENT_ADMIN = "tournament.admin" as const;

/** Any of these grants entry to `/admin` shell (per-route checks may still 404). */
export const ADMIN_AREA_SLUGS = [
  ROLE_SANDBOX_ACCESS,
  ROLE_NEWS_EDITOR,
  ROLE_UTILITY_EDITOR,
  ROLE_TOURNAMENT_ADMIN,
] as const;

export type AdminAreaSlug = (typeof ADMIN_AREA_SLUGS)[number];

/**
 * Email of the immutable platform owner. Always retains `developer`; its
 * Full Admin grant can never be revoked through the users admin panel.
 * Anchored on email so it survives username / profile changes.
 */
export const PROTECTED_SUPERUSER_EMAIL = "agirton@intradark.com" as const;
