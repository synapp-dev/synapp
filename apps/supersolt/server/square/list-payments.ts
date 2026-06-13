import { getSquareBaseUrl, type SquareEnvironment } from "@/server/square/config";

const SQUARE_API_VERSION = "2025-12-17";
/** Square allows up to 100 payments per List Payments page. */
const PAYMENTS_PAGE_SIZE = 100;
/**
 * Safety cap so a runaway cursor cannot loop forever.
 * 500 pages × 100 = 50_000 payments per date-range request.
 */
const PAYMENTS_MAX_PAGES = 500;

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
  | {
      ok: true;
      payments: SquarePaymentListItem[];
      truncated: boolean;
      pagesFetched: number;
    }
  | { ok: false; message: string; status: number }
> {
  const base = apiBaseForStoredEnv(args.storedEnvironment);
  const collected: SquarePaymentListItem[] = [];
  let cursor: string | undefined;
  let pagesFetched = 0;
  let truncated = false;

  while (pagesFetched < PAYMENTS_MAX_PAGES) {
    const url = new URL(`${base}/v2/payments`);
    url.searchParams.set("begin_time", args.beginTime);
    url.searchParams.set("end_time", args.endTime);
    url.searchParams.set("sort_order", "DESC");
    url.searchParams.set("limit", String(PAYMENTS_PAGE_SIZE));
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
    pagesFetched += 1;
    cursor = body.cursor;
    if (!cursor || batch.length === 0) {
      break;
    }
  }

  if (cursor) {
    truncated = true;
    console.warn(
      "[square] list payments truncated",
      JSON.stringify({
        beginTime: args.beginTime,
        endTime: args.endTime,
        pagesFetched,
        paymentCount: collected.length,
      })
    );
  }

  return { ok: true, payments: collected, truncated, pagesFetched };
}
