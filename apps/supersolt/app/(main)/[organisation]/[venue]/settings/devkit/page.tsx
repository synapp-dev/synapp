import { redirect } from "next/navigation";
import { redirectToScopedVenuePath } from "@/server/access/redirect-to-scoped-venue-path";
import { getServerRequestAuthContext } from "@/server/auth/server-context";
import { isOrganisationAdmin } from "@/server/auth/rbac";
import { scopeRepo } from "@/server/db/scope.repo";
import { AdminToolsPageClient } from "@/app/(main)/[organisation]/[venue]/admin-tools/_components/admin-tools-page-client";

export default async function SettingsDevKitPage({
  params,
}: {
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;
  const ctx = await getServerRequestAuthContext();

  if (!ctx) {
    redirect(`/auth/login?returnTo=/${organisation}/${venue}/settings/devkit`);
  }

  const context = await ctx.appDb.rls((tx) =>
    scopeRepo.getVenueContextBySlugs(tx, organisation, venue),
  );

  if (!context) {
    await redirectToScopedVenuePath("dashboard");
  }

  const venueContext = context!;

  const isAdmin = isOrganisationAdmin(
    ctx.tenantRoles,
    venueContext.organisationId,
  );

  if (!isAdmin) {
    redirect(`/${organisation}/${venue}/insights/sales`);
  }

  return (
    <AdminToolsPageClient
      organisation={organisation}
      venue={venue}
      venueName={venueContext.venueName}
    />
  );
}
