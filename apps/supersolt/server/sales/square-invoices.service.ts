import type { RequestAuthContext } from "@/server/auth/context";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import {
  loadSquareConnectionForVenue,
  VenueAccessError,
} from "@/server/sales/sales-insights.service";
import {
  listSquareInvoicesForVenue,
  type SquareInvoiceApiItem,
} from "@/server/square/list-invoices";
import type {
  SquareInvoiceRow,
  SquareInvoicesApiPayload,
} from "@/entities/sales-insights/model/types";

function recipientLabel(
  recipient: SquareInvoiceApiItem["primary_recipient"],
): string | null {
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
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    startIso: string;
    endIso: string;
  },
): Promise<SquareInvoicesApiPayload> {
  const context = await resolveVenueScopeForService(
    ctx,
    args.organisationSlug,
    args.venueSlug,
    {
      notFound: (message) => new VenueAccessError(404, message),
      forbidden: (auth) => new VenueAccessError(auth.status, auth.message),
    },
  );

  const connection = await loadSquareConnectionForVenue(
    ctx.appDb,
    context.venueId,
  );

  if (!connection) {
    return {
      invoices: [],
      meta: { dataSource: "demo" },
    };
  }

  const locationId = connection.squareLocationId?.trim() ?? "";
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
    accessToken: connection.squareAccessToken,
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

  const invoices = listed.invoices
    .map(mapSquareInvoiceRow)
    .filter((row): row is SquareInvoiceRow => row !== null);

  return {
    invoices,
    meta: {
      dataSource: "square",
    },
  };
}
