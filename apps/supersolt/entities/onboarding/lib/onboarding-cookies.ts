import type { ScopedContext } from "@/entities/access/scoped-navigation-context";
import { setVenueScopeCookieClient } from "@/lib/venue-scope-cookie";

/** Allows middleware to permit /{org}/{venue}/insights/sales while needsSetup. */
export const ONBOARDING_EARLY_SALES_COOKIE = "ss_onboarding_early_sales";

export function setOnboardingEarlySalesCookie(enabled: boolean): void {
  if (typeof document === "undefined") {
    return;
  }
  if (enabled) {
    document.cookie = `${ONBOARDING_EARLY_SALES_COOKIE}=1; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
  } else {
    document.cookie = `${ONBOARDING_EARLY_SALES_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }
}

export function syncOnboardingVenueScope(scope: ScopedContext): void {
  setVenueScopeCookieClient(scope);
}
