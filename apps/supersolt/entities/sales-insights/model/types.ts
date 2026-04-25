export type DatePreset =
  | "today"
  | "yesterday"
  | "this-week"
  | "last-week"
  | "this-month"
  | "last-30"
  | "custom";

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
  squareError?: string;
  /** Set when payments loaded but Square Orders API failed (missing ORDERS_READ or API error). */
  squareOrdersError?: string;
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

export type SalesDateRange = {
  start: Date;
  end: Date;
};

export type SalesQueryInput = {
  organisationSlug: string;
  venueSlug: string;
  dateRange: SalesDateRange;
};
