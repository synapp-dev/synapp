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
