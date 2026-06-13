import type { ScopedContext } from "@/entities/access/scoped-navigation-context";

export const VENUE_SCOPE_COOKIE_NAME = "supersolt_venue_scope";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function serializeVenueScopeCookie(scope: ScopedContext): string {
  return `${encodeURIComponent(scope.organisationSlug)}::${encodeURIComponent(scope.venueSlug)}`;
}

export function parseVenueScopeCookie(
  value: string | undefined | null,
): ScopedContext | null {
  if (!value) {
    return null;
  }

  const separator = value.indexOf("::");
  if (separator === -1) {
    return null;
  }

  const organisationSlug = decodeURIComponent(value.slice(0, separator));
  const venueSlug = decodeURIComponent(value.slice(separator + 2));

  if (!organisationSlug || !venueSlug) {
    return null;
  }

  return { organisationSlug, venueSlug };
}

/** Client-side: persist venue switcher selection for server redirects. */
export function setVenueScopeCookieClient(scope: ScopedContext): void {
  if (typeof document === "undefined") {
    return;
  }

  const encoded = serializeVenueScopeCookie(scope);
  document.cookie = `${VENUE_SCOPE_COOKIE_NAME}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}
