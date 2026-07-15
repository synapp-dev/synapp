/**
 * Maps a supplier's delivery schedule (per-weekday order/delivery pairs, as
 * captured on the supplier detail page) to the next concrete order and
 * delivery dates, so the order guide can say "order today, delivered Tue"
 * instead of just quoting a lead time.
 *
 * Weekday convention matches JS Date.getDay(): 0 = Sunday.
 */

export type DeliveryScheduleEntry = {
  day: number;
  is_order_day: boolean;
  order_by_time: string | null;
  delivery_day: number | null;
};

export type SupplierScheduleInfo = {
  source: "supplier_schedule" | "lead_time";
  /** e.g. "Mon, Tue & Fri" - the supplier's order days; null on lead-time fallback. */
  orderDaysLabel: string | null;
  /** Venue-local ISO date the next order should be placed. */
  nextOrderDate: string;
  nextOrderIsToday: boolean;
  /** Cutoff time on the order day, when the supplier captures one ("14:00"). */
  orderByTime: string | null;
  /** Venue-local ISO date that order is expected to arrive. */
  nextDeliveryDate: string;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekdayOf(isoDate: string): number {
  return new Date(`${isoDate}T12:00:00Z`).getUTCDay();
}

function formatOrderDaysLabel(days: number[]): string | null {
  const labels = days
    .sort((a, b) => a - b)
    .map((day) => DAY_LABELS[day])
    .filter(Boolean);
  if (labels.length === 0) return null;
  if (labels.length === 7) return "any day";
  if (labels.length === 1) return labels[0] ?? null;
  return `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]}`;
}

export function computeSupplierScheduleInfo(args: {
  schedule: DeliveryScheduleEntry[] | null | undefined;
  leadTimeDays: number;
  /** Venue-local "today" as an ISO date. */
  venueToday: string;
}): SupplierScheduleInfo {
  const leadTimeDays = Math.max(0, args.leadTimeDays || 0);
  const entries = Array.isArray(args.schedule) ? args.schedule : [];
  const byDay = new Map(
    entries
      .filter((entry) => Number.isInteger(entry?.day))
      .map((entry) => [entry.day, entry]),
  );
  const orderDays = entries
    .filter((entry) => entry?.is_order_day)
    .map((entry) => entry.day);

  if (orderDays.length === 0) {
    return {
      source: "lead_time",
      orderDaysLabel: null,
      nextOrderDate: args.venueToday,
      nextOrderIsToday: true,
      orderByTime: null,
      nextDeliveryDate: addDays(args.venueToday, leadTimeDays),
    };
  }

  const todayDow = weekdayOf(args.venueToday);
  for (let offset = 0; offset < 7; offset += 1) {
    const dow = (todayDow + offset) % 7;
    const entry = byDay.get(dow);
    if (!entry?.is_order_day) continue;

    const orderDate = addDays(args.venueToday, offset);
    let deliveryDate: string;
    if (entry.delivery_day !== null && Number.isInteger(entry.delivery_day)) {
      // "0 days later" would mean order and delivery on the same weekday;
      // real-world that pairing means the following week's run.
      const delta = (entry.delivery_day - dow + 7) % 7 || 7;
      deliveryDate = addDays(orderDate, delta);
    } else {
      deliveryDate = addDays(orderDate, leadTimeDays);
    }

    return {
      source: "supplier_schedule",
      orderDaysLabel: formatOrderDaysLabel(orderDays),
      nextOrderDate: orderDate,
      nextOrderIsToday: offset === 0,
      orderByTime: entry.order_by_time,
      nextDeliveryDate: deliveryDate,
    };
  }

  // Unreachable when orderDays is non-empty, but keep the fallback total.
  return {
    source: "lead_time",
    orderDaysLabel: formatOrderDaysLabel(orderDays),
    nextOrderDate: args.venueToday,
    nextOrderIsToday: true,
    orderByTime: null,
    nextDeliveryDate: addDays(args.venueToday, leadTimeDays),
  };
}
