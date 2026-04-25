import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";
import { assertUserHasVenueAccess, VenueAccessError } from "@/server/access/venue-access";
import { ingredientsRepo } from "@/server/ingredients/ingredients.repo";
import { loadSquareConnectionForVenue } from "@/server/sales/sales-insights.service";
import {
  listSquareInvoicesForVenue,
  type SquareInvoiceApiItem,
} from "@/server/square/list-invoices";
import type {
  SquareInvoiceRow,
  SquareInvoicesApiPayload,
} from "@/entities/sales-insights/model/types";

type Supabase = SupabaseClient<Database>;
type AdminClient = SupabaseClient<Database>;

function recipientLabel(recipient: SquareInvoiceApiItem["primary_recipient"]): string | null {
  if (!recipient) {
    return null;
  }
  const given = recipient.given_name?.trim() ?? "";
  const family = recipient.family_name?.trim() ?? "";
  const name = [given, family].filter(Boolean).join(" ").trim();
  if (name) {
    return name;
  }
  const email = recipient.email_address?.trim();
  if (email) {
    return email;
  }
  const phone = recipient.phone_number?.trim();
  if (phone) {
    return phone;
  }
  const cid = recipient.customer_id?.trim();
  return cid ? `Customer ${cid.slice(0, 8)}...` : null;
}

function mapSquareInvoiceRow(inv: SquareInvoiceApiItem): SquareInvoiceRow | null {
  const id = inv.id?.trim();
  if (!id) {
    return null;
  }
  const money = inv.next_payment_amount_money;
  const amount =
    money && typeof money.amount === "number" && Number.isFinite(money.amount)
      ? money.amount
      : null;
  const currency =
    money && typeof money.currency === "string" && money.currency.length > 0
      ? money.currency
      : null;

  return {
    id,
    invoice_number: inv.invoice_number?.trim() ?? null,
    title: inv.title?.trim() ?? null,
    status: inv.status?.trim() ?? "UNKNOWN",
    created_at: inv.created_at?.trim() ?? new Date(0).toISOString(),
    scheduled_at: inv.scheduled_at?.trim() ?? null,
    order_id: inv.order_id?.trim() ?? null,
    public_url: inv.public_url?.trim() ?? null,
    next_payment_amount_cents: amount,
    next_payment_currency: currency,
    customer_label: recipientLabel(inv.primary_recipient),
  };
}

export async function getSquareInvoicesForInsights(
  userSupabase: Supabase,
  admin: AdminClient | null,
  args: {
    userId: string;
    organisationSlug: string;
    venueSlug: string;
    startIso: string;
    endIso: string;
  }
): Promise<SquareInvoicesApiPayload> {
  const context = await ingredientsRepo.getVenueContextBySlugs(
    userSupabase,
    args.organisationSlug,
    args.venueSlug
  );
  if (!context) {
    throw new VenueAccessError(404, "Venue not found");
  }

  await assertUserHasVenueAccess(userSupabase, {
    userId: args.userId,
    organisationId: context.organisationId,
    venueId: context.venueId,
  });

  const connection = await loadSquareConnectionForVenue(userSupabase, admin, context.venueId);

  if (!connection) {
    return {
      invoices: [],
      meta: { dataSource: "demo" },
    };
  }

  const locationId = connection.square_location_id?.trim() ?? "";
  if (!locationId) {
    return {
      invoices: [],
      meta: {
        dataSource: "square",
        squareInvoicesError:
          "Square location is not set for this venue. Choose a location in settings, then reconnect Square if needed.",
      },
    };
  }

  const listed = await listSquareInvoicesForVenue({
    accessToken: connection.square_access_token,
    storedEnvironment: connection.environment,
    locationId,
    startIso: args.startIso,
    endIso: args.endIso,
  });

  if (!listed.ok) {
    return {
      invoices: [],
      meta: {
        dataSource: "square",
        squareInvoicesError: listed.message,
      },
    };
  }

  const rows: SquareInvoiceRow[] = [];
  for (const inv of listed.invoices) {
    const row = mapSquareInvoiceRow(inv);
    if (row) {
      rows.push(row);
    }
  }

  rows.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return {
    invoices: rows,
    meta: { dataSource: "square" },
  };
}
