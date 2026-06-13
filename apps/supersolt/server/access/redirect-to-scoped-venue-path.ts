import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { buildScopedPath } from "@/lib/build-scoped-path";
import {
  VENUE_SCOPE_COOKIE_NAME,
  parseVenueScopeCookie,
} from "@/lib/venue-scope-cookie";
import { getCachedDashboardBootstrap } from "@/server/dashboard/get-cached-dashboard-bootstrap";
import { venueScopeFromAccess } from "@/server/access/resolve-venue-scope";

export type ScopedVenueSection = "agent" | "dashboard";

export async function redirectToScopedVenuePath(
  section: ScopedVenueSection,
): Promise<never> {
  const bootstrap = await getCachedDashboardBootstrap();

  if (bootstrap.kind === "unauthenticated") {
    redirect("/auth");
  }

  if (bootstrap.kind === "error") {
    redirect("/auth");
  }

  if (bootstrap.access.organisations.length === 0) {
    redirect("/setup");
  }

  const cookieStore = await cookies();
  const preferred = parseVenueScopeCookie(
    cookieStore.get(VENUE_SCOPE_COOKIE_NAME)?.value,
  );
  const scope = venueScopeFromAccess(bootstrap.access, preferred);

  if (!scope) {
    redirect("/setup");
  }

  redirect(buildScopedPath(scope.organisationSlug, scope.venueSlug, section));
}
