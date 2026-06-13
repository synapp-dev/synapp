import type { RequestAuthContext } from "@/server/auth/context";
import { invoicesRepo } from "@/server/invoices/invoices.repo";
import { resolveInvoiceVenueScope } from "@/server/invoices/invoice-shared";

export async function ensureVenueEmailInboxForIntegrations(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  const context = await resolveInvoiceVenueScope(ctx, organisationSlug, venueSlug);
  return invoicesRepo.ensureVenueInbox(ctx.appDb, {
    organisationId: context.organisationId,
    venueId: context.venueId,
    venueSlug,
  });
}

export const ensureVenueEmailInbox = ensureVenueEmailInboxForIntegrations;
