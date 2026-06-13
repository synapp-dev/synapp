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
    });

    expect(snapshot.dataSource).toBe("square");
    expect(snapshot.hero.countUpEnd).toBe(120);
    expect(snapshot.netRevenueSeries).toHaveLength(7);
    expect(snapshot.netRevenueSeries[0]?.revenue).toBe(50);
    expect(snapshot.netRevenueSeries[1]?.revenue).toBe(70);
    expect(snapshot.avgCheckKpi.id).toBe("avg-check");
    expect(snapshot.avgCheckKpi.countUpEnd).toBe(60);
    expect(snapshot.hero.deltaDirection).toBe("up");
  });
});
