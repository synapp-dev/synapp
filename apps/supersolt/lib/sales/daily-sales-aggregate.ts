import type { SalesOrderRow } from "@/entities/sales-insights/model/types";
import { formatShiftDateInVenue } from "@/lib/roster/venue-time";
import { channelRevenueBucket } from "@/lib/sales/channel-bucket";

export type DailySalesAggregate = {
  date: string;
  revenueCents: number;
  ordersCount: number;
  avgCheckCents: number;
  refundsCount: number;
  refundsValueCents: number;
  voidsCount: number;
  dineInRevenueCents: number;
  pickUpRevenueCents: number;
  deliveryRevenueCents: number;
};

function emptyDay(date: string): DailySalesAggregate {
  return {
    date,
    revenueCents: 0,
    ordersCount: 0,
    avgCheckCents: 0,
    refundsCount: 0,
    refundsValueCents: 0,
    voidsCount: 0,
    dineInRevenueCents: 0,
    pickUpRevenueCents: 0,
    deliveryRevenueCents: 0,
  };
}

/** Aggregate Square (or demo) orders into venue-local calendar days. */
export function aggregateOrdersToDailySales(
  orders: SalesOrderRow[],
  timezone: string,
): DailySalesAggregate[] {
  const byDate = new Map<string, DailySalesAggregate>();

  for (const order of orders) {
    const date = formatShiftDateInVenue(order.order_datetime, timezone);
    const day = byDate.get(date) ?? emptyDay(date);

    if (order.is_void) {
      day.voidsCount += 1;
      byDate.set(date, day);
      continue;
    }

    if (order.is_refund) {
      day.refundsCount += 1;
      day.refundsValueCents += Math.abs(order.net_amount);
      byDate.set(date, day);
      continue;
    }

    const net = Math.max(0, order.net_amount);
    day.revenueCents += net;
    day.ordersCount += 1;

    const bucket = channelRevenueBucket(order.channel);
    if (bucket === "delivery") {
      day.deliveryRevenueCents += net;
    } else if (bucket === "pick_up") {
      day.pickUpRevenueCents += net;
    } else {
      day.dineInRevenueCents += net;
    }

    byDate.set(date, day);
  }

  for (const day of byDate.values()) {
    day.avgCheckCents =
      day.ordersCount === 0 ? 0 : Math.round(day.revenueCents / day.ordersCount);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
