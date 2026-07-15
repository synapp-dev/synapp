import { describe, expect, it } from "vitest";

import type {
  SalesLineItemRow,
  SalesOrderRow,
} from "@/entities/sales-insights/model/types";
import { computeAvgCheckBreakdown } from "@/server/sales/dashboard-avg-check-breakdown.service";

function line(
  name: string,
  grossCents: number,
  menuItemId: string | null = null,
  quantity = 1,
): SalesLineItemRow {
  return {
    lineUid: `${name}-${grossCents}`,
    quantity,
    lineName: name,
    grossAmountCents: grossCents,
    currency: "AUD",
    menuItemId,
    matchSource: menuItemId ? "catalog_link" : "unmapped",
  };
}

function order(
  id: string,
  netCents: number,
  lines: SalesLineItemRow[],
  flags?: Partial<Pick<SalesOrderRow, "is_void" | "is_refund">>,
): SalesOrderRow {
  return {
    id,
    order_number: id,
    order_datetime: "2026-07-13T10:00:00+10:00",
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
    saleLineItems: lines,
    ...flags,
  };
}

describe("computeAvgCheckBreakdown", () => {
  const sections = new Map([
    ["m-latte", "COFFEE"],
    ["m-panini", "PANINI"],
    ["m-juice", "DRINKS"],
  ]);

  it("splits line revenue into title-cased sections with per-check averages", () => {
    const result = computeAvgCheckBreakdown({
      dataSource: "square",
      sectionByMenuItemId: sections,
      orders: [
        order("a", 2000, [
          line("Latte", 500, "m-latte"),
          line("Panini", 1500, "m-panini"),
        ]),
        order("b", 1000, [line("Latte", 500, "m-latte", 2)]),
      ],
    });

    expect(result.totalOrders).toBe(2);
    expect(result.avgCheckCents).toBe(1500);

    expect(result.categories.map((c) => c.label)).toEqual([
      "Panini",
      "Coffee",
    ]);
    const coffee = result.categories.find((c) => c.label === "Coffee")!;
    expect(coffee.revenueCents).toBe(1000);
    expect(coffee.quantity).toBe(3);
    expect(coffee.sharePct).toBe(40);
    expect(coffee.avgPerCheckCents).toBe(500);
    expect(coffee.attachRatePct).toBe(100);

    const panini = result.categories.find((c) => c.label === "Panini")!;
    expect(panini.attachRatePct).toBe(50);
  });

  it("ignores voids/refunds and rolls the tail plus unmapped lines into Other", () => {
    const manySections = new Map(
      Array.from({ length: 7 }, (_, i) => [`m-${i}`, `SECTION ${i}`] as const),
    );
    const orders = Array.from({ length: 7 }, (_, i) =>
      order(`o-${i}`, 1000, [line(`Item ${i}`, 1000 - i, `m-${i}`)]),
    );
    orders.push(order("unmapped", 300, [line("Mystery", 300)]));
    orders.push(order("void", 900, [line("Voided", 900, "m-0")], { is_void: true }));

    const result = computeAvgCheckBreakdown({
      dataSource: "square",
      sectionByMenuItemId: manySections,
      orders,
    });

    expect(result.totalOrders).toBe(8);
    // 5 named sections survive, the rest (2 sections + unmapped) roll into Other.
    expect(result.categories).toHaveLength(6);
    const other = result.categories[result.categories.length - 1]!;
    expect(other.label).toBe("Other");
    expect(other.revenueCents).toBe(995 + 994 + 300);
    // 3 of 8 orders contain a rolled-up category.
    expect(other.attachRatePct).toBe(38);
    const shareTotal = result.categories.reduce((s, c) => s + c.sharePct, 0);
    expect(shareTotal).toBeGreaterThan(99);
    expect(shareTotal).toBeLessThan(101);
  });

  it("buckets demo line names via the keyword map", () => {
    const result = computeAvgCheckBreakdown({
      dataSource: "demo",
      sectionByMenuItemId: new Map(),
      orders: [
        order("a", 1200, [
          line("Flat white", 550),
          line("Side fries", 600),
        ]),
      ],
    });

    expect(result.categories.map((c) => c.label).sort()).toEqual([
      "Coffee",
      "Sides",
    ]);
  });

  it("handles an empty window", () => {
    const result = computeAvgCheckBreakdown({
      dataSource: "square",
      sectionByMenuItemId: new Map(),
      orders: [],
    });
    expect(result.totalOrders).toBe(0);
    expect(result.avgCheckCents).toBe(0);
    expect(result.categories).toEqual([]);
  });
});
