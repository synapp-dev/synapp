import type { RequestAuthContext } from "@/server/auth/context";
import { getSalesInsightsOrders, VenueAccessError } from "./sales-insights.service";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { formatShiftDateInVenue } from "@/lib/roster/venue-time";
import { computeSalesItemAnalytics } from "@/entities/sales-insights/lib/sales-item-analytics";
import type { SalesMixRow, SalesOrderRow } from "@/entities/sales-insights/model/types";

export const MAX_SALES_SUMMARY_RANGE_DAYS = 92;
export const SALES_SUMMARY_TOP_ITEMS = 20;

export type SalesInsightsSummaryArgs = {
  organisationSlug: string;
  venueSlug: string;
  /** Calendar dates (YYYY-MM-DD) interpreted in the venue's timezone. */
  from: string;
  to: string;
};

export type SalesSummaryTopItem = {
  label: string;
  quantity: number;
  revenueCents: number;
  /** Share of sales-mix revenue in the period, 0-100 rounded to 1dp. */
  revenueSharePct: number;
  mapped: boolean;
};

export type SalesInsightsSummary = {
  organisationSlug: string;
  venueSlug: string;
  organisationName: string;
  venueName: string;
  from: string;
  to: string;
  timezone: string;
  dataSource: "square" | "demo";
  totals: {
    revenueCents: number;
    orders: number;
    avgCheckCents: number;
    refundCount: number;
    refundCents: number;
    voidCount: number;
  };
  topItems: SalesSummaryTopItem[];
  otherItemsCount: number;
  otherRevenueCents: number;
  totalMixItems: number;
};

class SalesSummaryRangeError extends Error {}

function parseDateParts(value: string): { y: number; m: number; d: number } {
  const [y, m, d] = value.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new SalesSummaryRangeError(`Invalid date: ${value}`);
  }
  return { y: y!, m: m!, d: d! };
}

function timeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcMs));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  // formatToParts is second-granular; compare against the second-floored input
  // so sub-second wall times don't leak into the offset.
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * UTC instant for a wall-clock moment in an IANA timezone. Single-pass offset
 * correction; close enough at DST boundaries for day-range reporting.
 */
export function zonedTimeToUtcIso(
  date: string,
  timeZone: string,
  end: boolean,
): string {
  const { y, m, d } = parseDateParts(date);
  const wallUtc = end
    ? Date.UTC(y, m - 1, d, 23, 59, 59, 999)
    : Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  const offset = timeZoneOffsetMs(wallUtc, timeZone);
  return new Date(wallUtc - offset).toISOString();
}

function daySpan(from: string, to: string): number {
  const a = parseDateParts(from);
  const b = parseDateParts(to);
  return (
    (Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000 + 1
  );
}

/** Shift a YYYY-MM-DD calendar date by whole days (calendar-safe, no timezone). */
function shiftIsoDate(date: string, days: number): string {
  const { y, m, d } = parseDateParts(date);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  const yy = shifted.getUTCFullYear();
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(shifted.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function summariseTotals(orders: SalesOrderRow[]) {
  const valid = orders.filter((o) => !o.is_void);
  const sales = valid.filter((o) => !o.is_refund);
  const refunds = valid.filter((o) => o.is_refund);
  const revenueCents = sales.reduce((sum, o) => sum + o.net_amount, 0);
  const refundCents = refunds.reduce((sum, o) => sum + o.net_amount, 0);
  return {
    revenueCents,
    orders: sales.length,
    avgCheckCents: sales.length === 0 ? 0 : Math.round(revenueCents / sales.length),
    refundCount: refunds.length,
    refundCents,
    voidCount: orders.filter((o) => o.is_void).length,
  };
}

function summariseMix(salesMix: SalesMixRow[]): {
  topItems: SalesSummaryTopItem[];
  otherItemsCount: number;
  otherRevenueCents: number;
  totalMixItems: number;
} {
  const mixRevenue = salesMix.reduce((sum, row) => sum + row.revenueCents, 0);
  const top = salesMix.slice(0, SALES_SUMMARY_TOP_ITEMS);
  const rest = salesMix.slice(SALES_SUMMARY_TOP_ITEMS);
  return {
    topItems: top.map((row) => ({
      label: row.label,
      quantity: row.quantity,
      revenueCents: row.revenueCents,
      revenueSharePct:
        mixRevenue === 0
          ? 0
          : Math.round((row.revenueCents / mixRevenue) * 1000) / 10,
      mapped: row.mapped,
    })),
    otherItemsCount: rest.length,
    otherRevenueCents: rest.reduce((sum, row) => sum + row.revenueCents, 0),
    totalMixItems: salesMix.length,
  };
}

async function loadSalesRange(ctx: RequestAuthContext, args: SalesInsightsSummaryArgs) {
  const span = daySpan(args.from, args.to);
  if (!Number.isFinite(span) || span < 1 || span > MAX_SALES_SUMMARY_RANGE_DAYS) {
    throw new VenueAccessError(
      400,
      `Date range must be 1 to ${MAX_SALES_SUMMARY_RANGE_DAYS} days`,
    );
  }

  const scope = await resolveVenueScopeForService(
    ctx,
    args.organisationSlug,
    args.venueSlug,
    {
      notFound: (message) => new VenueAccessError(404, message),
      forbidden: (auth) => new VenueAccessError(auth.status, auth.message),
    },
  );

  const { orders, meta, salesMix } = await getSalesInsightsOrders(ctx, {
    organisationSlug: args.organisationSlug,
    venueSlug: args.venueSlug,
    startIso: zonedTimeToUtcIso(args.from, scope.timezone, false),
    endIso: zonedTimeToUtcIso(args.to, scope.timezone, true),
  });

  return { scope, orders, meta, salesMix };
}

export async function getSalesInsightsSummary(
  ctx: RequestAuthContext,
  args: SalesInsightsSummaryArgs,
): Promise<SalesInsightsSummary> {
  const { scope, orders, meta, salesMix } = await loadSalesRange(ctx, args);

  return {
    organisationSlug: args.organisationSlug,
    venueSlug: args.venueSlug,
    organisationName: scope.organisationName,
    venueName: scope.venueName,
    from: args.from,
    to: args.to,
    timezone: scope.timezone,
    dataSource: meta.dataSource,
    totals: summariseTotals(orders),
    ...summariseMix(salesMix),
  };
}

export type SalesMixReportData = {
  organisationName: string;
  venueName: string;
  from: string;
  to: string;
  dataSource: "square" | "demo";
  totals: SalesInsightsSummary["totals"];
  /** Full mix, revenue-descending, with share of mix revenue (0-100, 1dp). */
  rows: Array<SalesSummaryTopItem>;
};

export const DASHBOARD_TOP_ITEMS_WINDOW_DAYS = 7;
export const DASHBOARD_TOP_ITEMS_DEFAULT_LIMIT = 5;

export type DashboardTopSellerDailyPoint = {
  /** Short axis label, e.g. "5 Jul". */
  label: string;
  quantity: number;
  revenueCents: number;
};

/**
 * One top-selling item enriched with the drawer-grade analytics the dashboard
 * spotlight cycles through (avg price, attach rate, peak day, daily series).
 */
export type DashboardTopSeller = {
  label: string;
  quantity: number;
  revenueCents: number;
  /** Share of sales-mix revenue in the window, 0-100 rounded to 1dp. */
  revenueSharePct: number;
  mapped: boolean;
  /** Mean revenue per unit sold, in cents. */
  avgUnitPriceCents: number;
  /** Share of orders in the window that included this item, 0-100. */
  attachRatePercent: number;
  /** Busiest weekday / hour labels, null when there's no signal. */
  peakDayLabel: string | null;
  peakHourLabel: string | null;
  /** Continuous per-day sold series across the window (quiet days show as 0). */
  daily: DashboardTopSellerDailyPoint[];
};

export type DashboardTopSellingItems = {
  /** Start of the trailing window (YYYY-MM-DD, venue timezone), inclusive. */
  from: string;
  /** Today in the venue timezone (YYYY-MM-DD), inclusive. */
  to: string;
  windowDays: number;
  dataSource: "square" | "demo";
  /** Sales-mix leaders, revenue-descending, capped at the requested limit. */
  items: DashboardTopSeller[];
  /** Distinct items in the full mix for the window (for a "+N more" hint). */
  totalMixItems: number;
};

/**
 * Top-selling POS items for the dashboard spotlight: the sales-mix leaders over
 * the trailing week in the venue's timezone, each enriched with the same
 * per-item analytics the sales-page detail drawer shows. Reuses
 * `getSalesInsightsOrders` + `computeSalesItemAnalytics` so ranking, mapping,
 * demo-fallback and every stat stay identical to the insights page.
 */
export async function getDashboardTopSellingItems(
  ctx: RequestAuthContext,
  args: { organisationSlug: string; venueSlug: string; limit?: number },
): Promise<DashboardTopSellingItems> {
  const scope = await resolveVenueScopeForService(
    ctx,
    args.organisationSlug,
    args.venueSlug,
    {
      notFound: (message) => new VenueAccessError(404, message),
      forbidden: (auth) => new VenueAccessError(auth.status, auth.message),
    },
  );

  const to = formatShiftDateInVenue(new Date().toISOString(), scope.timezone);
  const from = shiftIsoDate(to, -(DASHBOARD_TOP_ITEMS_WINDOW_DAYS - 1));

  const { orders, meta, salesMix } = await getSalesInsightsOrders(ctx, {
    organisationSlug: args.organisationSlug,
    venueSlug: args.venueSlug,
    startIso: zonedTimeToUtcIso(from, scope.timezone, false),
    endIso: zonedTimeToUtcIso(to, scope.timezone, true),
  });

  const mixRevenue = salesMix.reduce((sum, row) => sum + row.revenueCents, 0);
  const limit = Math.max(
    1,
    Math.min(
      args.limit ?? DASHBOARD_TOP_ITEMS_DEFAULT_LIMIT,
      SALES_SUMMARY_TOP_ITEMS,
    ),
  );

  const items: DashboardTopSeller[] = salesMix.slice(0, limit).map((row) => {
    const analytics = computeSalesItemAnalytics({
      orders,
      mixRow: row,
      timezone: scope.timezone,
    });
    return {
      label: row.label,
      quantity: row.quantity,
      revenueCents: row.revenueCents,
      revenueSharePct:
        mixRevenue === 0
          ? 0
          : Math.round((row.revenueCents / mixRevenue) * 1000) / 10,
      mapped: row.mapped,
      avgUnitPriceCents: analytics.avgUnitPriceCents,
      attachRatePercent: analytics.attachRatePercent,
      peakDayLabel: analytics.peakDayLabel,
      peakHourLabel: analytics.peakHourLabel,
      daily: analytics.daily.map((point) => ({
        label: point.label,
        quantity: point.quantity,
        revenueCents: point.revenueCents,
      })),
    };
  });

  return {
    from,
    to,
    windowDays: DASHBOARD_TOP_ITEMS_WINDOW_DAYS,
    dataSource: meta.dataSource,
    items,
    totalMixItems: salesMix.length,
  };
}

export async function getSalesMixReportData(
  ctx: RequestAuthContext,
  args: SalesInsightsSummaryArgs,
): Promise<SalesMixReportData> {
  const { scope, orders, meta, salesMix } = await loadSalesRange(ctx, args);
  const mixRevenue = salesMix.reduce((sum, row) => sum + row.revenueCents, 0);

  return {
    organisationName: scope.organisationName,
    venueName: scope.venueName,
    from: args.from,
    to: args.to,
    dataSource: meta.dataSource,
    totals: summariseTotals(orders),
    rows: salesMix.map((row) => ({
      label: row.label,
      quantity: row.quantity,
      revenueCents: row.revenueCents,
      revenueSharePct:
        mixRevenue === 0
          ? 0
          : Math.round((row.revenueCents / mixRevenue) * 1000) / 10,
      mapped: row.mapped,
    })),
  };
}
