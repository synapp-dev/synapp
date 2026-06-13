import { redirect } from "next/navigation";

import { DashboardPageClient } from "@/entities/dashboard/components/dashboard-page";
import { redirectToScopedVenuePath } from "@/server/access/redirect-to-scoped-venue-path";
import { getCachedDashboardBootstrap } from "@/server/dashboard/get-cached-dashboard-bootstrap";
import { getDashboardPreferencesForUserOrg } from "@/server/dashboard/dashboard-preferences.service";
import { loadDashboardLiveSalesSnapshot } from "@/server/dashboard/dashboard-sales-snapshot.service";
import { getServerRequestAuthContext } from "@/server/auth/server-context";
import { scopeRepo } from "@/server/db/scope.repo";

export default async function ScopedDashboardPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;
  const bootstrap = await getCachedDashboardBootstrap();

  if (bootstrap.kind !== "ok") {
    redirect("/auth");
  }

  const ctx = await getServerRequestAuthContext();
  if (!ctx) {
    redirect("/auth");
  }

  const org = bootstrap.access.organisations.find(
    (candidate) => candidate.slug === organisation,
  );
  if (!org) {
    await redirectToScopedVenuePath("dashboard");
  }

  const venueRecord = org!.venues.find((candidate) => candidate.slug === venue);
  if (!venueRecord) {
    await redirectToScopedVenuePath("dashboard");
  }

  const resolvedOrg = org!;
  const resolvedVenue = venueRecord!;

  const prefs = await getDashboardPreferencesForUserOrg(ctx, resolvedOrg.id);

  let venueTimezone = "Australia/Melbourne";
  const venueContext = await ctx.appDb.rls((tx) =>
    scopeRepo.getVenueContextBySlugs(tx, resolvedOrg.slug, resolvedVenue.slug),
  );
  if (venueContext) {
    venueTimezone = venueContext.timezone;
  }

  let initialLiveSales = null;
  try {
    initialLiveSales = await loadDashboardLiveSalesSnapshot(ctx, {
      organisationSlug: resolvedOrg.slug,
      venueSlug: resolvedVenue.slug,
    });
  } catch (error) {
    console.error("[dashboard] live sales snapshot", error);
  }

  return (
    <DashboardPageClient
      organisationName={resolvedOrg.name}
      organisationSlug={resolvedOrg.slug}
      defaultVenueId={resolvedVenue.id}
      venueTimezone={venueTimezone}
      linkScope={{
        organisationSlug: resolvedOrg.slug,
        venueSlug: resolvedVenue.slug,
      }}
      initialPreferences={prefs}
      initialLiveSales={initialLiveSales}
    />
  );
}
