import { describe, expect, it } from "vitest";

import type { SalesOrderRow } from "@/entities/sales-insights/model/types";
import { buildDashboardSalesSnapshot } from "@/lib/dashboard/build-dashboard-sales-snapshot";

function order(id: string, iso: string, netCents: number): SalesOrderRow {
  return {
    id,
    order_number: id,
    order_datetime: iso,
    channel: "dine_in",
    gross_amount: netCents,
    tax_amount: 0,
    discount_amount: 0,
    net_amount: netCents,
    payment_method: "card",
    source: "square",
    is_void: false,
    is_refund: false,
    refund_reason: null,
  };
}

describe("buildDashboardSalesSnapshot", () => {
  it("aggregates venue-local week revenue and avg check from orders", () => {
    const tz = "Australia/Melbourne";
    const todayIso = "2026-05-20";
    const snapshot = buildDashboardSalesSnapshot({
      timezone: tz,
      todayIso,
      orders: [
        order("a", "2026-05-18T10:00:00+10:00", 5000),
        order("b", "2026-05-19T11:00:00+10:00", 7000),
        order("c", "2026-05-11T09:00:00+10:00", 4000),
      ],
      revenueForecastCentsByDate: {
        "2026-05-18": 5500,
        "2026-05-20": 6200,
        "2026-05-21": 6400,
      },
    });

    expect(snapshot.dataSource).toBe("square");
    expect(snapshot.hero.countUpEnd).toBe(120);

    // Window centred on today (2026-05-20, a Wednesday): Sun 17 → Sat 23.
    expect(snapshot.netRevenueSeries).toHaveLength(7);
    expect(snapshot.netRevenueSeries.map((p) => p.label)).toEqual([
      "Sun",
      "Mon",
      "Tue",
      "Today",
      "Thu",
      "Fri",
      "Sat",
    ]);
    // Actuals stop at the last traded day; today has no orders yet, so it
    // stays null (the chart's pulsing dot marks the frontier) and the
    // projection carries on.
    expect(snapshot.netRevenueSeries[1]?.revenue).toBe(50);
    expect(snapshot.netRevenueSeries[2]?.revenue).toBe(70);
    expect(snapshot.netRevenueSeries[3]?.revenue).toBeNull();
    expect(snapshot.netRevenueSeries[4]?.revenue).toBeNull();
    expect(snapshot.netRevenueSeries[1]?.forecast).toBe(55);
    expect(snapshot.netRevenueSeries[3]?.forecast).toBe(62);
    expect(snapshot.netRevenueSeries[4]?.forecast).toBe(64);

    expect(snapshot.avgCheckKpi.id).toBe("avg-check");
    expect(snapshot.avgCheckKpi.countUpEnd).toBe(60);
    expect(snapshot.hero.deltaDirection).toBe("up");
  });

  it("falls back to trailing history when no forward forecast exists", () => {
    const snapshot = buildDashboardSalesSnapshot({
      timezone: "Australia/Melbourne",
      todayIso: "2026-05-20",
      orders: [order("a", "2026-05-18T10:00:00+10:00", 5000)],
    });

    // Trailing window: 14 May → today; past days are actuals, but today
    // has no trade yet so it stays null.
    expect(snapshot.netRevenueSeries).toHaveLength(7);
    expect(snapshot.netRevenueSeries[6]?.label).toBe("Today");
    expect(snapshot.netRevenueSeries[6]?.revenue).toBeNull();
    expect(
      snapshot.netRevenueSeries.slice(0, 6).every((p) => p.revenue !== null),
    ).toBe(true);
  });

  it("keeps today on the actual line once it has trade", () => {
    const snapshot = buildDashboardSalesSnapshot({
      timezone: "Australia/Melbourne",
      todayIso: "2026-05-20",
      orders: [order("a", "2026-05-20T10:00:00+10:00", 5000)],
      revenueForecastCentsByDate: { "2026-05-21": 6000 },
    });

    const todayPoint = snapshot.netRevenueSeries.find((p) => p.label === "Today");
    expect(todayPoint?.revenue).toBe(50);
  });
});
