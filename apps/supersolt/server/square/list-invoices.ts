import { getSquareBaseUrl, type SquareEnvironment } from "@/server/square/config";

const SQUARE_API_VERSION = "2025-12-17";

/** Raw invoice object from Square `ListInvoices` (snake_case JSON). */
export type SquareInvoiceApiItem = {
  id?: string;
  location_id?: string;
  order_id?: string;
  invoice_number?: string;
  title?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  scheduled_at?: string;
  public_url?: string;
  next_payment_amount_money?: { amount?: number; currency?: string };
  primary_recipient?: {
    customer_id?: string;
    given_name?: string;
    family_name?: string;
    email_address?: string;
    phone_number?: string;
  };
};

type ListInvoicesResponse = {
  invoices?: SquareInvoiceApiItem[];
  cursor?: string;
  errors?: Array<{ detail?: string; code?: string }>;
};

function apiBaseForStoredEnv(environment: string): string {
  const env = (environment === "production" ? "production" : "sandbox") as SquareEnvironment;
  return getSquareBaseUrl(env);
}

function isPublishedSentStatus(status: string | undefined): boolean {
  return Boolean(status && status !== "DRAFT");
}

function createdAtInRange(createdAt: string | undefined, startMs: number, endMs: number): boolean {
  if (!createdAt) {
    return false;
  }
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) {
    return false;
  }
  return t >= startMs && t <= endMs;
}

/**
 * List invoices for a Square location (paginated), then keep only published invoices
 * whose `created_at` falls in `[startIso, endIso]` (inclusive).
 * Requires INVOICES_READ on the OAuth token.
 */
export async function listSquareInvoicesForVenue(args: {
  accessToken: string;
  storedEnvironment: string;
  locationId: string;
  startIso: string;
  endIso: string;
}): Promise<
  { ok: true; invoices: SquareInvoiceApiItem[] } | { ok: false; message: string; status: number }
> {
  const base = apiBaseForStoredEnv(args.storedEnvironment);
  const startMs = new Date(args.startIso).getTime();
  const endMs = new Date(args.endIso).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return { ok: false, message: "Invalid start or end datetime", status: 400 };
  }

  const collected: SquareInvoiceApiItem[] = [];
  let cursor: string | undefined;
  const maxPages = 50;

  for (let page = 0; page < maxPages; page += 1) {
    const url = new URL(`${base}/v2/invoices`);
    url.searchParams.set("location_id", args.locationId);
    url.searchParams.set("limit", "200");
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Square-Version": SQUARE_API_VERSION,
        "Content-Type": "application/json",
      },
    });

    const body = (await res.json()) as ListInvoicesResponse & { message?: string };

    if (!res.ok) {
      const detail =
        body.message ??
        body.errors?.map((e) => e.detail).filter(Boolean).join("; ") ??
        `Square list invoices failed (${res.status})`;
      return { ok: false, message: detail, status: res.status };
    }

    const batch = body.invoices ?? [];
    for (const inv of batch) {
      if (!isPublishedSentStatus(inv.status)) {
        continue;
      }
      if (!createdAtInRange(inv.created_at, startMs, endMs)) {
        continue;
      }
      collected.push(inv);
    }

    cursor = body.cursor;
    if (!cursor || batch.length === 0) {
      break;
    }
  }

  return { ok: true, invoices: collected };
}
