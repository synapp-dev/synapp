import type { RequestAuthContext } from "@/server/auth/context";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { salesInsightsRepo } from "@/server/sales/sales-insights.repo";
import {
  getSalesInsightsOrders,
  VenueAccessError,
} from "@/server/sales/sales-insights.service";
import { zonedTimeToUtcIso } from "@/server/sales/sales-insights-summary.service";
import { thisWeekCalendarBoundsInVenue } from "@/lib/dashboard/dashboard-sales-week";
import type { SalesOrderRow } from "@/entities/sales-insights/model/types";

/** Categories shown individually before the rest rolls into "Other". */
export const DASHBOARD_AVG_CHECK_MAX_CATEGORIES = 5;

const OTHER_LABEL = "Other";

/** Mock sales data carries no menu-item mapping; bucket by POS line name. */
const DEMO_LINE_CATEGORIES: Record<string, string> = {
  "flat white": "Coffee",
  "avo toast": "Breakfast",
  "orange juice": "Drinks",
  "burger combo": "Mains",
  "side fries": "Sides",
};

export type DashboardAvgCheckCategory = {
  /** Stable bucket key (lower-cased label). */
  key: string;
  label: string;
  revenueCents: number;
  quantity: number;
  /** Share of line-item revenue in the window, 0-100 rounded to 1dp. */
  sharePct: number;
  /** Average spend on this category per order across ALL orders in the window. */
  avgPerCheckCents: number;
  /** Share of orders in the window containing at least one line of this category, 0-100. */
  attachRatePct: number;
};

export type DashboardAvgCheckBreakdown = {
  /** Monday of the current venue-local week (YYYY-MM-DD), inclusive. */
  from: string;
  /** Today in the venue timezone (YYYY-MM-DD), inclusive. */
  to: string;
  dataSource: "square" | "demo";
  totalOrders: number;
  /** Net revenue / orders — matches the dashboard avg-check KPI basis. */
  avgCheckCents: number;
  /** Revenue-descending, capped at the max with the tail rolled into "Other". */
  categories: DashboardAvgCheckCategory[];
};

/** POS sections arrive shouty ("ICED COFFEE"); show them as "Iced Coffee". */
function formatSectionLabel(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") return OTHER_LABEL;
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed
    .toLowerCase()
    .replace(/(^|[\s/&-])\p{L}/gu, (ch) => ch.toUpperCase());
}

function categoryForLine(
  line: { menuItemId?: string | null; lineName: string },
  sectionByMenuItemId: Map<string, string>,
  dataSource: "square" | "demo",
): string {
  if (line.menuItemId) {
    const section = sectionByMenuItemId.get(line.menuItemId);
    if (section && section.trim() !== "") return formatSectionLabel(section);
  }
  if (dataSource === "demo") {
    const demo = DEMO_LINE_CATEGORIES[line.lineName.trim().toLowerCase()];
    if (demo) return demo;
  }
  return OTHER_LABEL;
}

/**
 * Pure aggregation seam (exported for tests): splits the window's line-item
 * revenue into menu sections and expresses each as dollars-of-the-average-check,
 * so the category amounts read as "of your $34 check, $12 is coffee".
 */
export function computeAvgCheckBreakdown(args: {
  orders: SalesOrderRow[];
  sectionByMenuItemId: Map<string, string>;
  dataSource: "square" | "demo";
}): Pick<
  DashboardAvgCheckBreakdown,
  "totalOrders" | "avgCheckCents" | "categories"
> {
  const sales = args.orders.filter((o) => !o.is_void && !o.is_refund);
  const totalOrders = sales.length;
  const netRevenueCents = sales.reduce((sum, o) => sum + o.net_amount, 0);
  const avgCheckCents =
    totalOrders === 0 ? 0 : Math.round(netRevenueCents / totalOrders);

  const buckets = new Map<
    string,
    { label: string; revenueCents: number; quantity: number }
  >();
  const orderCategorySets: Array<Set<string>> = [];

  for (const order of sales) {
    const present = new Set<string>();
    for (const line of order.saleLineItems ?? []) {
      const label = categoryForLine(
        line,
        args.sectionByMenuItemId,
        args.dataSource,
      );
      const key = label.toLowerCase();
      present.add(key);
      const prev = buckets.get(key);
      if (prev) {
        prev.revenueCents += line.grossAmountCents;
        prev.quantity += line.quantity;
      } else {
        buckets.set(key, {
          label,
          revenueCents: line.grossAmountCents,
          quantity: line.quantity,
        });
      }
    }
    orderCategorySets.push(present);
  }

  const ranked = [...buckets.entries()]
    .map(([key, b]) => ({ key, ...b }))
    .sort((a, b) => b.revenueCents - a.revenueCents);

  // "Other" always ranks last regardless of size so named sections lead.
  const otherIdx = ranked.findIndex((r) => r.label === OTHER_LABEL);
  const otherBucket = otherIdx >= 0 ? ranked.splice(otherIdx, 1)[0]! : null;

  const top = ranked.slice(0, DASHBOARD_AVG_CHECK_MAX_CATEGORIES);
  const tail = ranked.slice(DASHBOARD_AVG_CHECK_MAX_CATEGORIES);

  const rolled = {
    key: OTHER_LABEL.toLowerCase(),
    label: OTHER_LABEL,
    revenueCents:
      (otherBucket?.revenueCents ?? 0) +
      tail.reduce((sum, r) => sum + r.revenueCents, 0),
    quantity:
      (otherBucket?.quantity ?? 0) +
      tail.reduce((sum, r) => sum + r.quantity, 0),
  };

  const finalBuckets = rolled.revenueCents > 0 ? [...top, rolled] : top;
  const lineRevenueTotal = finalBuckets.reduce(
    (sum, r) => sum + r.revenueCents,
    0,
  );

  const topKeys = new Set(top.map((r) => r.key));
  const attachCount = (key: string): number => {
    if (key !== rolled.key) {
      return orderCategorySets.filter((set) => set.has(key)).length;
    }
    // Rolled bucket: orders containing anything outside the surviving top keys.
    return orderCategorySets.filter((set) =>
      [...set].some((k) => !topKeys.has(k)),
    ).length;
  };

  const categories: DashboardAvgCheckCategory[] = finalBuckets.map((r) => ({
    key: r.key,
    label: r.label,
    revenueCents: r.revenueCents,
    quantity: r.quantity,
    sharePct:
      lineRevenueTotal === 0
        ? 0
        : Math.round((r.revenueCents / lineRevenueTotal) * 1000) / 10,
    avgPerCheckCents:
      totalOrders === 0 ? 0 : Math.round(r.revenueCents / totalOrders),
    attachRatePct:
      totalOrders === 0
        ? 0
        : Math.round((attachCount(r.key) / totalOrders) * 100),
  }));

  return { totalOrders, avgCheckCents, categories };
}

/**
 * Avg-check category breakdown for the dashboard's wide Avg Check card: the
 * current venue-local week through today (same window as the avg-check KPI),
 * split by menu-item section via the Square catalog mapping.
 */
export async function getDashboardAvgCheckBreakdown(
  ctx: RequestAuthContext,
  args: { organisationSlug: string; venueSlug: string },
): Promise<DashboardAvgCheckBreakdown> {
  const scope = await resolveVenueScopeForService(
    ctx,
    args.organisationSlug,
    args.venueSlug,
    {
      notFound: (message) => new VenueAccessError(404, message),
      forbidden: (auth) => new VenueAccessError(auth.status, auth.message),
    },
  );

  const { weekMonday, throughDate } = thisWeekCalendarBoundsInVenue(
    scope.timezone,
  );

  const { orders, meta } = await getSalesInsightsOrders(ctx, {
    organisationSlug: args.organisationSlug,
    venueSlug: args.venueSlug,
    startIso: zonedTimeToUtcIso(weekMonday, scope.timezone, false),
    endIso: zonedTimeToUtcIso(throughDate, scope.timezone, true),
  });

  const sections = await ctx.appDb.rls((tx) =>
    salesInsightsRepo.listMenuItemSections(tx, scope.venueId),
  );
  const sectionByMenuItemId = new Map(
    sections.map((s) => [s.id, s.sectionName]),
  );

  return {
    from: weekMonday,
    to: throughDate,
    dataSource: meta.dataSource,
    ...computeAvgCheckBreakdown({
      orders,
      sectionByMenuItemId,
      dataSource: meta.dataSource,
    }),
  };
}
