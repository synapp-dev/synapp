import type {
  InsightsDatePreset,
  InsightsDateRange,
} from "@/entities/insights/model/types";

export type DatePreset = InsightsDatePreset;
export type SalesDateRange = InsightsDateRange;

export type SortField =
  | "order_datetime"
  | "order_number"
  | "channel"
  | "gross_amount"
  | "tax_amount"
  | "net_amount"
  | "payment_method";

export type SortDir = "asc" | "desc";

export type SalesOrderSource = "square" | "demo" | "manual";

export type SalesLineMatchSource = "catalog_link" | "name_exact" | "unmapped";

/** One modifier applied to a Square order line (e.g. "Extra cheese"). */
export type SalesLineModifier = {
  name: string;
  /** Modifier quantity as reported by Square (usually 1 per line unit). */
  quantity: number;
  /** Total charged for this modifier on the line, in cents (0 for free mods). */
  amountCents: number;
  catalogObjectId?: string | null;
};

/** One order line from Square (after catalog / name mapping). */
export type SalesLineItemRow = {
  lineUid: string;
  quantity: number;
  lineName: string;
  grossAmountCents: number;
  currency: string;
  squareCatalogObjectId?: string | null;
  /** Square variation when present (e.g. size); same POS name can represent different catalog rows. */
  squareVariationName?: string | null;
  menuItemId?: string | null;
  menuItemName?: string | null;
  matchSource: SalesLineMatchSource;
  /** Modifiers applied to this line (null/absent when the mirror predates capture). */
  modifiers?: SalesLineModifier[] | null;
};

/** Aggregated quantities / revenue for Sales mix (mapped menu lines + unmapped labels). */
export type SalesMixRow = {
  /** Stable id for this mix bucket (matches server aggregation key; use for React keys). */
  mixKey: string;
  menuItemId: string | null;
  label: string;
  quantity: number;
  revenueCents: number;
  mapped: boolean;
  /** Square catalog object for this bucket (two mix rows with the same label usually differ here). */
  squareCatalogObjectId?: string | null;
  /** POS line name for this bucket (first line in the bucket). */
  squareLineName?: string | null;
  /** Square variation when present. */
  squareVariationName?: string | null;
};

/** Extra fields from Square ListPayments when `source` is `square`. */
export type SalesOrderSquareDetail = {
  squarePaymentId: string;
  status?: string;
  sourceType?: string;
  orderId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  amountMoney?: { amount?: number; currency?: string };
  totalMoney?: { amount?: number; currency?: string };
  refundedMoney?: { amount?: number; currency?: string };
  locationId?: string;
  receiptUrl?: string;
  receiptNumber?: string;
  referenceId?: string;
  customerId?: string;
  note?: string;
};

export type SalesOrderRow = {
  id: string;
  order_number: string | null;
  order_datetime: string;
  channel: string;
  gross_amount: number;
  tax_amount: number;
  net_amount: number;
  discount_amount: number;
  is_void: boolean;
  is_refund: boolean;
  refund_reason: string | null;
  payment_method: string | null;
  /** Where this row came from (Square API, generated demo, or manual entry). */
  source?: SalesOrderSource;
  /** Present for Square-backed rows; used in the detail drawer. */
  square?: SalesOrderSquareDetail;
  /** Square order lines (or demo lines) for this payment / order. */
  saleLineItems?: SalesLineItemRow[];
};

export type SalesInsightsMeta = {
  dataSource: "square" | "demo";
  /** IANA timezone for hour-of-day grouping (venue wall clock). */
  venueTimezone?: string;
  squareError?: string;
  /** Set when payments loaded but Square Orders API failed (missing ORDERS_READ or API error). */
  squareOrdersError?: string;
  /** True when Square returned more payments than we could fetch in one request. */
  squarePaymentsTruncated?: boolean;
  /** Last successful payment mirror sync (ISO). */
  lastSyncedAt?: string | null;
  syncStatus?: "idle" | "syncing" | "failed";
  backfillStatus?: "idle" | "running" | "complete" | "failed";
};

/** Square Invoices API row for Sales Insights (published invoices in date range). */
export type SquareInvoiceRow = {
  id: string;
  invoice_number: string | null;
  title: string | null;
  status: string;
  created_at: string;
  scheduled_at: string | null;
  order_id: string | null;
  public_url: string | null;
  next_payment_amount_cents: number | null;
  next_payment_currency: string | null;
  customer_label: string | null;
};

export type SquareInvoicesMeta = {
  dataSource: "square" | "demo";
  squareInvoicesError?: string;
};

export type SquareInvoicesApiPayload = {
  invoices: SquareInvoiceRow[];
  meta: SquareInvoicesMeta;
};

export type SalesQueryInput = {
  organisationSlug: string;
  venueSlug: string;
  dateRange: SalesDateRange;
};
