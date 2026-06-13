/**
 * Route suffixes (after /{org}/{venue}/) unlocked during setup before finalize.
 * Phase 1a: Sales only after Square connects.
 */

export const ONBOARDING_ROUTE_SUFFIX_SALES = "insights/sales";

/** Suffixes allowed when Square is connected but setup is not finalized. */
export function earlyOnboardingUnlockedSuffixes(
  squareConnected: boolean,
): string[] {
  if (!squareConnected) {
    return [];
  }
  return [ONBOARDING_ROUTE_SUFFIX_SALES];
}

export function isRouteUnlockedDuringSetup(
  pathSuffix: string,
  squareConnected: boolean,
): boolean {
  const normalized = pathSuffix.replace(/^\/+/, "");
  return earlyOnboardingUnlockedSuffixes(squareConnected).some(
    (allowed) =>
      normalized === allowed || normalized.startsWith(`${allowed}/`),
  );
}

export function pathSuffixFromNavUrl(url: string): string | null {
  const match = url.match(/^\/([^/]+)\/([^/]+)\/(.+)$/);
  if (!match) {
    return null;
  }
  return match[3] ?? null;
}

/** True when pathname is an org/venue route allowed during setup (Square connected). */
export function isEarlyOnboardingScopedPathAllowed(
  pathname: string,
  squareConnected: boolean,
): boolean {
  const suffix = pathSuffixFromNavUrl(pathname);
  if (!suffix) {
    return false;
  }
  return isRouteUnlockedDuringSetup(suffix, squareConnected);
}
