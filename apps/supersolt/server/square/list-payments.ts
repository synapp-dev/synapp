import { getSquareBaseUrl, type SquareEnvironment } from "@/server/square/config";

const SQUARE_API_VERSION = "2025-12-17";

export type SquarePaymentListItem = {
  id?: string;
  created_at?: string;
  updated_at?: string;
  amount_money?: { amount?: number; currency?: string };
  total_money?: { amount?: number; currency?: string };
  refunded_money?: { amount?: number; currency?: string };
  status?: string;
  source_type?: string;
  order_id?: string;
  location_id?: string;
  receipt_url?: string;
  receipt_number?: string;
  reference_id?: string;
  customer_id?: string;
  note?: string;
};

type ListPaymentsResponse = {
  payments?: SquarePaymentListItem[];
  cursor?: string;
  errors?: Array<{ detail?: string; code?: string }>;
};

function apiBaseForStoredEnv(environment: string): string {
  const env = (environment === "production" ? "production" : "sandbox") as SquareEnvironment;
  return getSquareBaseUrl(env);
}

/**
 * List payments for the authorized merchant in [beginTime, endTime] (ISO 8601).
 * Requires PAYMENTS_READ on the OAuth token.
 */
export async function listSquarePaymentsForVenue(args: {
  accessToken: string;
  storedEnvironment: string;
  beginTime: string;
  endTime: string;
  locationId?: string | null;
}): Promise<
  { ok: true; payments: SquarePaymentListItem[] } | { ok: false; message: string; status: number }
> {
  const base = apiBaseForStoredEnv(args.storedEnvironment);
  const collected: SquarePaymentListItem[] = [];
  let cursor: string | undefined;
  const maxPages = 8;

  for (let page = 0; page < maxPages; page += 1) {
    const url = new URL(`${base}/v2/payments`);
    url.searchParams.set("begin_time", args.beginTime);
    url.searchParams.set("end_time", args.endTime);
    url.searchParams.set("sort_order", "DESC");
    url.searchParams.set("limit", "100");
    if (args.locationId) {
      url.searchParams.set("location_id", args.locationId);
    }
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

    const body = (await res.json()) as ListPaymentsResponse & { message?: string };

    if (!res.ok) {
      const detail =
        body.message ??
        body.errors?.map((e) => e.detail).filter(Boolean).join("; ") ??
        `Square list payments failed (${res.status})`;
      return { ok: false, message: detail, status: res.status };
    }

    const batch = body.payments ?? [];
    collected.push(...batch);
    cursor = body.cursor;
    if (!cursor || batch.length === 0) {
      break;
    }
  }

  return { ok: true, payments: collected };
}
