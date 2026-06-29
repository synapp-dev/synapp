import {
  ROLE_DEVELOPER,
  ROLE_NEWS_EDITOR,
  ROLE_SANDBOX_ACCESS,
  ROLE_SITE_ACCESS,
  ROLE_UTILITY_EDITOR,
} from "./rbac-constants";

/**
 * Named admin tiers shown as toggles in the users panel. A bundle is purely a
 * UI-level set of capability slugs — granting it inserts its `slugs` as
 * `user_roles` rows; revoking it deletes them. There is no bundle table:
 * `user_roles` is the single source of truth (see {@link bundleIsActive}).
 *
 * `developer` implies every capability at the gate layer (`hasCapability`), so a
 * Full Admin needs no other slug. The non-developer bundles list the literal
 * slugs their area checks for.
 */
export type AdminBundle = {
  key: string;
  label: string;
  description: string;
  /** Capability slugs granted/revoked together for this bundle. */
  slugs: readonly string[];
  /** When true, only the protected superuser logic may grant/revoke it. */
  superuser?: boolean;
};

export const ADMIN_BUNDLES: readonly AdminBundle[] = [
  {
    key: "full",
    label: "Full Admin",
    description: "Superuser — implies every capability across the platform.",
    slugs: [ROLE_DEVELOPER],
    superuser: true,
  },
  {
    key: "early-access",
    label: "Early Access",
    description:
      "Bypass the coming-soon blackout and use the live app while in stealth.",
    slugs: [ROLE_SITE_ACCESS],
  },
  {
    key: "news",
    label: "News Admin",
    description: "Author and publish news articles.",
    slugs: [ROLE_NEWS_EDITOR, "nav.news"],
  },
  {
    key: "utility",
    label: "Utility Admin",
    description: "Review and publish community utility lineups.",
    slugs: [ROLE_UTILITY_EDITOR, "nav.utility"],
  },
  {
    key: "infra",
    label: "Infra / DevTools",
    description: "Sandbox simulators, CS2 servers, and maps.",
    slugs: [ROLE_SANDBOX_ACCESS],
  },
] as const;

export function getBundle(key: string): AdminBundle | undefined {
  return ADMIN_BUNDLES.find((b) => b.key === key);
}

/** True when the user explicitly holds every slug in the bundle. */
export function bundleIsActive(
  userSlugs: readonly string[],
  bundle: AdminBundle,
): boolean {
  const set = new Set(userSlugs);
  return bundle.slugs.every((s) => set.has(s));
}

/**
 * Slugs to actually delete when revoking `bundle` from a user who keeps their
 * other active bundles — i.e. bundle slugs not still required by another bundle
 * that remains on. Prevents a shared slug (e.g. a nav slug) from being yanked
 * out from under a bundle the user still has.
 */
export function slugsToRemoveForBundleRevoke(
  userSlugs: readonly string[],
  bundle: AdminBundle,
): string[] {
  const retained = ADMIN_BUNDLES.filter(
    (b) => b.key !== bundle.key && bundleIsActive(userSlugs, b),
  );
  const stillNeeded = new Set(retained.flatMap((b) => b.slugs));
  return bundle.slugs.filter((s) => !stillNeeded.has(s));
}
