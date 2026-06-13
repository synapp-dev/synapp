import { describe, expect, it } from "vitest";
import {
  aggregateOrdersByHourForDay,
  buildSameWeekdayHourlyMix,
  distributeDailyForecastToHours,
  isSingleCalendarDayRange,
} from "@/entities/sales-insights/lib/sales-hourly-ui";
import type { SalesOrderRow } from "@/entities/sales-insights/model/types";

function orderAt(iso: string, net: number): SalesOrderRow {
  return {
    id: iso,
    order_datetime: iso,
    order_number: "1",
    channel: "dine_in",
    gross_amount: net,
    tax_amount: 0,
    discount_amount: 0,
    net_amount: net,
    payment_method: "card",
    source: "square",
    is_refund: false,
    is_void: false,
    refund_reason: null,
  };
}

describe("sales-hourly-ui", () => {
  it("detects single calendar day ranges", () => {
    const start = new Date(2026, 4, 22, 0, 0, 0);
    const end = new Date(2026, 4, 22, 23, 59, 0);
    expect(isSingleCalendarDayRange(start, end)).toBe(true);
    expect(
      isSingleCalendarDayRange(start, new Date(2026, 4, 23, 0, 0, 0))
    ).toBe(false);
  });

  it("aggregates orders into venue-local hours", () => {
    const orders = [
      orderAt("2026-05-22T01:00:00.000Z", 1000),
      orderAt("2026-05-22T04:00:00.000Z", 2000),
    ];
    const totals = aggregateOrdersByHourForDay(
      orders,
      "2026-05-22",
      "Australia/Melbourne"
    );
    const nonZero = totals.filter((slot) => slot.revenueCents > 0);
    expect(nonZero.length).toBeGreaterThan(0);
  });

  it("distributes daily forecast across 24 hours", () => {
    const mix = distributeDailyForecastToHours(24_000, [
      0.5,
      ...Array.from({ length: 23 }, () => 0.5 / 23),
    ]);
    const total = mix.reduce((sum, value) => sum + value, 0);
    expect(Math.abs(total - 24_000)).toBeLessThanOrEqual(10);
  });

  it("builds same-weekday hourly mix from prior days only", () => {
    const orders = [
      orderAt("2026-05-15T03:00:00.000Z", 5000),
      orderAt("2026-05-22T03:00:00.000Z", 9000),
    ];
    const mix = buildSameWeekdayHourlyMix(
      orders,
      "2026-05-22",
      "Australia/Melbourne"
    );
    expect(mix).toHaveLength(24);
    expect(mix.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 5);
  });
});
