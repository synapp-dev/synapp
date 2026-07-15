import type { RequestAuthContext } from "@/server/auth/context";
import { assertVenueMember } from "@/server/auth/rbac";
import { scopeRepo } from "@/server/db/scope.repo";
import { xeroInvoicesRepo } from "@/server/xero/xero-invoices.repo";

export type VenueXeroConnectionSummary = {
  connected: boolean;
  tenantId: string | null;
  tenantName: string | null;
  updatedAt: string | null;
};

export async function getVenueXeroConnectionSummary(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
  },
): Promise<VenueXeroConnectionSummary> {
  const empty: VenueXeroConnectionSummary = {
    connected: false,
    tenantId: null,
    tenantName: null,
    updatedAt: null,
  };

  const context = await ctx.appDb.rls((tx) =>
    scopeRepo.getVenueContextBySlugs(tx, args.organisationSlug, args.venueSlug),
  );
  if (!context) {
    return empty;
  }

  try {
    assertVenueMember(ctx.tenantRoles, {
      organisationId: context.organisationId,
      venueId: context.venueId,
    });
  } catch {
    return empty;
  }

  const data = await ctx.appDb.rls((tx) =>
    xeroInvoicesRepo.getConnectionSummaryRls(tx, context.venueId),
  );

  if (!data) {
    return empty;
  }

  return {
    connected: true,
    tenantId: data.xeroTenantId,
    tenantName: data.xeroTenantName,
    updatedAt: data.updatedAt,
  };
}
