import { describe, expect, it } from "vitest";
import type { SalesOrderRow } from "@/entities/sales-insights/model/types";
import { aggregateOrdersToDailySales } from "@/lib/sales/daily-sales-aggregate";

function order(partial: Partial<SalesOrderRow> & { order_datetime: string }): SalesOrderRow {
  const { order_datetime, ...rest } = partial;
  return {
    id: "1",
    order_number: "100",
    order_datetime,
    channel: "pos",
    gross_amount: 1000,
    tax_amount: 0,
    net_amount: 1000,
    discount_amount: 0,
    is_void: false,
    is_refund: false,
    refund_reason: null,
    payment_method: "card",
    source: "square",
    ...rest,
  };
}

describe("aggregateOrdersToDailySales", () => {
  it("groups revenue and orders by venue-local date", () => {
    const rows = aggregateOrdersToDailySales(
      [
        order({
          order_datetime: "2026-05-20T22:00:00.000Z",
          net_amount: 2000,
        }),
        order({
          order_datetime: "2026-05-21T01:00:00.000Z",
          net_amount: 3000,
        }),
      ],
      "Australia/Melbourne"
    );

    expect(rows.length).toBeGreaterThanOrEqual(1);
    const totalRevenue = rows.reduce((s, r) => s + r.revenueCents, 0);
    expect(totalRevenue).toBe(5000);
    const totalOrders = rows.reduce((s, r) => s + r.ordersCount, 0);
    expect(totalOrders).toBe(2);
  });

  it("counts voids and refunds separately", () => {
    const rows = aggregateOrdersToDailySales(
      [
        order({
          order_datetime: "2026-05-21T10:00:00.000Z",
          is_void: true,
        }),
        order({
          order_datetime: "2026-05-21T11:00:00.000Z",
          is_refund: true,
          net_amount: -500,
        }),
      ],
      "UTC"
    );

    const day = rows.find((r) => r.date === "2026-05-21");
    expect(day?.voidsCount).toBe(1);
    expect(day?.refundsCount).toBe(1);
    expect(day?.refundsValueCents).toBe(500);
    expect(day?.ordersCount).toBe(0);
  });
});
