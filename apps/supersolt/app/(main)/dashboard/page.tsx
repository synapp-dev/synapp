import { redirect } from "next/navigation";

import { DashboardPageClient } from "@/entities/dashboard/components/dashboard-page-client";
import { getCachedDashboardBootstrap } from "@/server/dashboard/get-cached-dashboard-bootstrap";
import { getDashboardPreferencesForUserOrg } from "@/server/dashboard/dashboard-preferences.service";
import { createServerClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const bootstrap = await getCachedDashboardBootstrap();
  if (bootstrap.kind !== "ok") {
    redirect("/auth");
  }

  const org = bootstrap.access.organisations[0];
  if (!org) {
    redirect("/setup");
  }

  const supabase = await createServerClient();
  const prefs = await getDashboardPreferencesForUserOrg(
    supabase,
    bootstrap.userId,
    org.id,
  );
  const firstVenue = org.venues[0];

  return (
    <DashboardPageClient
      organisationName={org.name}
      organisationSlug={org.slug}
      defaultVenueId={firstVenue?.id ?? null}
      linkScope={
        firstVenue
          ? {
              organisationSlug: org.slug,
              venueSlug: firstVenue.slug,
            }
          : null
      }
      initialPreferences={prefs}
    />
  );
}
