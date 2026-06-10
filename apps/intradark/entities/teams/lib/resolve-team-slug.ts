/** Canonical team workspace path for a slug. */
export function teamHomePath(slug: string): string {
  return `/teams/${encodeURIComponent(slug)}/home`;
}

export function teamAdminPath(slug: string): string {
  return `/teams/${encodeURIComponent(slug)}/admin`;
}

export function teamUpcomingPath(slug: string): string {
  return `/teams/${encodeURIComponent(slug)}/upcoming`;
}

/**
 * When the URL segment does not match the stored slug (e.g. after rename),
 * return the canonical home path to redirect to.
 */
export function canonicalTeamPathIfMismatch(
  urlSlug: string,
  storedSlug: string,
): string | null {
  const decoded = decodeURIComponent(urlSlug);
  if (decoded === storedSlug) return null;
  return teamHomePath(storedSlug);
}
