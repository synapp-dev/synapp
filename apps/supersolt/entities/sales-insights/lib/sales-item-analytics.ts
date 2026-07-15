import { formatInTimeZone, toDate } from "date-fns-tz";
import type {
  SalesLineItemRow,
  SalesMixRow,
  SalesOrderRow,
} from "@/entities/sales-insights/model/types";

/**
 * Client-side analytics for a single Sales-mix bucket, computed from the
 * orders already loaded on the sales page (no extra API round trip).
 *
 * Matching mirrors `computeSalesMix` on the server: a line belongs to the
 * bucket whose key is `menuItemId` (mapped) or the unmapped composite key.
 * Voids and refunds are excluded, same as the mix itself.
 */

/** Must stay in lockstep with the aggregation key in sales-insights.service.ts. */
export function mixKeyForLine(line: SalesLineItemRow): string {
  return (
    line.menuItemId ??
    `unmapped::${line.lineName.trim().toLowerCase()}::${line.squareCatalogObjectId ?? ""}`
  );
}

export type ItemDailyPoint = {
  dayIso: string;
  /** Short axis label, e.g. "5 Jul". */
  label: string;
  quantity: number;
  revenueCents: number;
};

export type ItemWeekdayPoint = {
  /** ISO day of week, 1 = Monday. */
  dow: number;
  label: string;
  quantity: number;
  revenueCents: number;
};

export type ItemHourPoint = {
  hour: number;
  label: string;
  quantity: number;
};

export type ItemCompanionRow = {
  mixKey: string;
  label: string;
  /** Orders that contained both this bucket and the companion. */
  ordersTogether: number;
  /** ordersTogether as % of orders containing the item. */
  attachPercent: number;
};

export type ItemVariationRow = {
  label: string;
  quantity: number;
  revenueCents: number;
};

export type ItemModifierRow = {
  label: string;
  /** Units of the item sold with this modifier applied. */
  timesUsed: number;
  /** Extra revenue charged for the modifier (0 for free modifiers). */
  revenueCents: number;
  /** timesUsed as % of all units sold. */
  usagePercent: number;
};

export type ItemChannelRow = {
  channel: string;
  quantity: number;
  percent: number;
};

export type SalesItemAnalytics = {
  totalQuantity: number;
  totalRevenueCents: number;
  avgUnitPriceCents: number;
  /** Valid (non-void, non-refund) orders containing the item. */
  orderCount: number;
  /** All valid orders in the period. */
  totalOrderCount: number;
  attachRatePercent: number;
  avgQuantityPerOrder: number;
  /** Item revenue as % of all line revenue in the period. */
  revenueSharePercent: number;
  avgCheckWithItemCents: number | null;
  avgCheckWithoutItemCents: number | null;
  daily: ItemDailyPoint[];
  byWeekday: ItemWeekdayPoint[];
  /** Trimmed to the venue's active trading hours in the period. */
  byHour: ItemHourPoint[];
  companions: ItemCompanionRow[];
  variations: ItemVariationRow[];
  modifiers: ItemModifierRow[];
  channels: ItemChannelRow[];
  peakDayLabel: string | null;
  peakHourLabel: string | null;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}

function dayIsoInTimezone(isoDateTime: string, timezone: string): string {
  return formatInTimeZone(new Date(isoDateTime), timezone, "yyyy-MM-dd");
}

function hourInTimezone(isoDateTime: string, timezone: string): number {
  return Number(formatInTimeZone(new Date(isoDateTime), timezone, "H"));
}

/** ISO day of week (1 = Monday) for a venue-local calendar day. */
function dowForDayIso(dayIso: string, timezone: string): number {
  return Number(
    formatInTimeZone(
      toDate(`${dayIso}T12:00:00`, { timeZone: timezone }),
      timezone,
      "i",
    ),
  );
}

function shortDayLabel(dayIso: string, timezone: string): string {
  return formatInTimeZone(
    toDate(`${dayIso}T12:00:00`, { timeZone: timezone }),
    timezone,
    "d MMM",
  );
}

function addDaysIso(dayIso: string, days: number): string {
  const date = new Date(`${dayIso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function computeSalesItemAnalytics(args: {
  orders: SalesOrderRow[];
  mixRow: SalesMixRow;
  timezone: string;
}): SalesItemAnalytics {
  const { orders, mixRow, timezone } = args;
  const targetKey = mixRow.mixKey;

  let totalQuantity = 0;
  let totalRevenueCents = 0;
  let allLineRevenueCents = 0;
  let orderCount = 0;
  let totalOrderCount = 0;
  let netWithItemCents = 0;
  let netWithoutItemCents = 0;
  let withoutItemOrderCount = 0;

  const dailyMap = new Map<string, { quantity: number; revenueCents: number }>();
  const weekdayTotals = WEEKDAY_LABELS.map(() => ({
    quantity: 0,
    revenueCents: 0,
  }));
  const hourTotals = Array.from({ length: 24 }, () => 0);
  const venueActiveHours = Array.from({ length: 24 }, () => false);
  const companionMap = new Map<
    string,
    { label: string; ordersTogether: number }
  >();
  const variationMap = new Map<
    string,
    { quantity: number; revenueCents: number }
  >();
  const modifierMap = new Map<
    string,
    { timesUsed: number; revenueCents: number }
  >();
  const channelMap = new Map<string, number>();

  let minDayIso: string | null = null;
  let maxDayIso: string | null = null;

  for (const order of orders) {
    if (order.is_void || order.is_refund) continue;
    totalOrderCount += 1;

    const dayIso = dayIsoInTimezone(order.order_datetime, timezone);
    if (minDayIso === null || dayIso < minDayIso) minDayIso = dayIso;
    if (maxDayIso === null || dayIso > maxDayIso) maxDayIso = dayIso;

    const hour = hourInTimezone(order.order_datetime, timezone);
    if (hour >= 0 && hour <= 23) venueActiveHours[hour] = true;

    const lines = order.saleLineItems ?? [];
    let orderItemQuantity = 0;
    let orderItemRevenueCents = 0;
    // Companion buckets are counted once per order regardless of quantity.
    const otherBuckets = new Map<string, string>();

    for (const line of lines) {
      allLineRevenueCents += line.grossAmountCents;
      const key = mixKeyForLine(line);
      if (key === targetKey) {
        orderItemQuantity += line.quantity;
        orderItemRevenueCents += line.grossAmountCents;
        const variationLabel =
          line.squareVariationName?.trim() || line.lineName;
        const variation = variationMap.get(variationLabel) ?? {
          quantity: 0,
          revenueCents: 0,
        };
        variation.quantity += line.quantity;
        variation.revenueCents += line.grossAmountCents;
        variationMap.set(variationLabel, variation);
        for (const mod of line.modifiers ?? []) {
          const entry = modifierMap.get(mod.name) ?? {
            timesUsed: 0,
            revenueCents: 0,
          };
          entry.timesUsed += line.quantity * (mod.quantity || 1);
          entry.revenueCents += mod.amountCents;
          modifierMap.set(mod.name, entry);
        }
      } else {
        otherBuckets.set(key, line.menuItemName ?? line.lineName);
      }
    }

    if (orderItemQuantity <= 0) {
      withoutItemOrderCount += 1;
      netWithoutItemCents += order.net_amount;
      continue;
    }

    orderCount += 1;
    totalQuantity += orderItemQuantity;
    totalRevenueCents += orderItemRevenueCents;
    netWithItemCents += order.net_amount;

    const daily = dailyMap.get(dayIso) ?? { quantity: 0, revenueCents: 0 };
    daily.quantity += orderItemQuantity;
    daily.revenueCents += orderItemRevenueCents;
    dailyMap.set(dayIso, daily);

    const weekday = weekdayTotals[dowForDayIso(dayIso, timezone) - 1];
    if (weekday) {
      weekday.quantity += orderItemQuantity;
      weekday.revenueCents += orderItemRevenueCents;
    }

    if (hour >= 0 && hour <= 23) {
      hourTotals[hour] = (hourTotals[hour] ?? 0) + orderItemQuantity;
    }

    for (const [key, label] of otherBuckets) {
      const companion = companionMap.get(key) ?? { label, ordersTogether: 0 };
      companion.ordersTogether += 1;
      companionMap.set(key, companion);
    }

    channelMap.set(
      order.channel,
      (channelMap.get(order.channel) ?? 0) + orderItemQuantity,
    );
  }

  // Continuous day series across the loaded period so quiet days show as gaps.
  const daily: ItemDailyPoint[] = [];
  if (minDayIso && maxDayIso) {
    for (
      let dayIso = minDayIso;
      dayIso <= maxDayIso;
      dayIso = addDaysIso(dayIso, 1)
    ) {
      const totals = dailyMap.get(dayIso);
      daily.push({
        dayIso,
        label: shortDayLabel(dayIso, timezone),
        quantity: totals?.quantity ?? 0,
        revenueCents: totals?.revenueCents ?? 0,
      });
    }
  }

  const byWeekday: ItemWeekdayPoint[] = weekdayTotals.map((totals, index) => ({
    dow: index + 1,
    label: WEEKDAY_LABELS[index]!,
    quantity: totals.quantity,
    revenueCents: totals.revenueCents,
  }));

  const activeHourIndices = venueActiveHours
    .map((active, hour) => (active ? hour : -1))
    .filter((hour) => hour >= 0);
  const firstHour = activeHourIndices[0] ?? 0;
  const lastHour = activeHourIndices[activeHourIndices.length - 1] ?? 23;
  const byHour: ItemHourPoint[] = [];
  for (let hour = firstHour; hour <= lastHour; hour += 1) {
    byHour.push({
      hour,
      label: formatHourLabel(hour),
      quantity: hourTotals[hour] ?? 0,
    });
  }

  const companions: ItemCompanionRow[] = [...companionMap.entries()]
    .map(([mixKey, entry]) => ({
      mixKey,
      label: entry.label,
      ordersTogether: entry.ordersTogether,
      attachPercent:
        orderCount > 0 ? (entry.ordersTogether / orderCount) * 100 : 0,
    }))
    .sort(
      (left, right) =>
        right.ordersTogether - left.ordersTogether ||
        left.label.localeCompare(right.label),
    );

  const variations: ItemVariationRow[] = [...variationMap.entries()]
    .map(([label, totals]) => ({ label, ...totals }))
    .sort((left, right) => right.quantity - left.quantity);

  const modifiers: ItemModifierRow[] = [...modifierMap.entries()]
    .map(([label, totals]) => ({
      label,
      ...totals,
      usagePercent:
        totalQuantity > 0 ? (totals.timesUsed / totalQuantity) * 100 : 0,
    }))
    .sort(
      (left, right) =>
        right.timesUsed - left.timesUsed ||
        left.label.localeCompare(right.label),
    );

  const channels: ItemChannelRow[] = [...channelMap.entries()]
    .map(([channel, quantity]) => ({
      channel,
      quantity,
      percent: totalQuantity > 0 ? (quantity / totalQuantity) * 100 : 0,
    }))
    .sort((left, right) => right.quantity - left.quantity);

  const peakWeekday = byWeekday.reduce(
    (best, point) => (point.quantity > (best?.quantity ?? 0) ? point : best),
    null as ItemWeekdayPoint | null,
  );
  const peakHour = byHour.reduce(
    (best, point) => (point.quantity > (best?.quantity ?? 0) ? point : best),
    null as ItemHourPoint | null,
  );

  return {
    totalQuantity,
    totalRevenueCents,
    avgUnitPriceCents:
      totalQuantity > 0 ? Math.round(totalRevenueCents / totalQuantity) : 0,
    orderCount,
    totalOrderCount,
    attachRatePercent:
      totalOrderCount > 0 ? (orderCount / totalOrderCount) * 100 : 0,
    avgQuantityPerOrder: orderCount > 0 ? totalQuantity / orderCount : 0,
    revenueSharePercent:
      allLineRevenueCents > 0
        ? (totalRevenueCents / allLineRevenueCents) * 100
        : 0,
    avgCheckWithItemCents:
      orderCount > 0 ? Math.round(netWithItemCents / orderCount) : null,
    avgCheckWithoutItemCents:
      withoutItemOrderCount > 0
        ? Math.round(netWithoutItemCents / withoutItemOrderCount)
        : null,
    daily,
    byWeekday,
    byHour,
    companions,
    variations,
    modifiers,
    channels,
    peakDayLabel: peakWeekday && peakWeekday.quantity > 0 ? peakWeekday.label : null,
    peakHourLabel: peakHour && peakHour.quantity > 0 ? peakHour.label : null,
  };
}
