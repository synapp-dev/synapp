import { aggregateOrdersToDailySales } from "@/lib/sales/daily-sales-aggregate";
import { formatShiftDateInVenue } from "@/lib/roster/venue-time";
import type { AppDb } from "@/server/db/create-app-db";
import { forecastRepo } from "@/server/forecast/forecast.repo";
import { mirrorPaymentsToSalesOrders } from "@/server/square/square-mirror-map";
import { squareSyncRepo } from "@/server/square/square-sync.repo";
import { isoRangeFromDates } from "@/server/square/square-sync-window";

function toDailySalesInsert(
  venueId: string,
  row: ReturnType<typeof aggregateOrdersToDailySales>[number],
) {
  return {
    venueId,
    date: row.date,
    revenueCents: row.revenueCents,
    ordersCount: row.ordersCount,
    avgCheckCents: row.avgCheckCents,
    refundsCount: row.refundsCount,
    refundsValueCents: row.refundsValueCents,
    voidsCount: row.voidsCount,
    dineInRevenueCents: row.dineInRevenueCents,
    pickUpRevenueCents: row.pickUpRevenueCents,
    deliveryRevenueCents: row.deliveryRevenueCents,
    source: "square",
    computedAt: new Date().toISOString(),
  };
}

/** Recompute daily_sales from the full payment mirror for each affected calendar day. */
export async function recomputeDailySalesForDates(
  appDb: AppDb,
  args: {
    venueId: string;
    timezone: string;
    dates: string[];
  },
): Promise<number> {
  const uniqueDates = [...new Set(args.dates)].sort();
  if (uniqueDates.length === 0) {
    return 0;
  }

  const fromDay = uniqueDates[0]!;
  const toDay = uniqueDates[uniqueDates.length - 1]!;
  const { startIso, endIso } = isoRangeFromDates(
    args.timezone,
    fromDay,
    toDay,
  );

  const payments = await squareSyncRepo.listPaymentsInRangeAdmin(appDb, {
    venueId: args.venueId,
    startIso,
    endIso,
  });

  const paymentIds = payments.map((p) => p.squarePaymentId);
  const lines = await squareSyncRepo.listOrderLinesForPaymentsAdmin(appDb, {
    venueId: args.venueId,
    squarePaymentIds: paymentIds,
  });

  const allOrders = mirrorPaymentsToSalesOrders(payments, lines);

  const ordersByDate = new Map<string, typeof allOrders>();
  for (const order of allOrders) {
    const date = formatShiftDateInVenue(order.order_datetime, args.timezone);
    if (!uniqueDates.includes(date)) {
      continue;
    }
    const bucket = ordersByDate.get(date) ?? [];
    bucket.push(order);
    ordersByDate.set(date, bucket);
  }

  const rows = uniqueDates.flatMap((date) => {
    const dayOrders = ordersByDate.get(date) ?? [];
    const aggregates = aggregateOrdersToDailySales(dayOrders, args.timezone);
    return aggregates
      .filter((a) => a.date === date)
      .map((a) => toDailySalesInsert(args.venueId, a));
  });

  if (rows.length > 0) {
    await forecastRepo.upsertDailySales(appDb, rows);
  }

  return rows.length;
}

export function calendarDatesForOrders(
  orderDatetimes: string[],
  timezone: string,
): string[] {
  return [
    ...new Set(
      orderDatetimes.map((iso) => formatShiftDateInVenue(iso, timezone)),
    ),
  ];
}
