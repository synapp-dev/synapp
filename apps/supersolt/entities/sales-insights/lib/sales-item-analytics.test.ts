import { describe, expect, it } from "vitest";
import {
  computeSalesItemAnalytics,
  mixKeyForLine,
} from "@/entities/sales-insights/lib/sales-item-analytics";
import type {
  SalesLineItemRow,
  SalesMixRow,
  SalesOrderRow,
} from "@/entities/sales-insights/model/types";

const TZ = "Australia/Melbourne";

function line(
  name: string,
  quantity: number,
  grossAmountCents: number,
  overrides: Partial<SalesLineItemRow> = {},
): SalesLineItemRow {
  return {
    lineUid: `${name}-${Math.abs(grossAmountCents)}-${quantity}`,
    quantity,
    lineName: name,
    grossAmountCents,
    currency: "AUD",
    matchSource: "unmapped",
    ...overrides,
  };
}

function order(
  iso: string,
  lines: SalesLineItemRow[],
  overrides: Partial<SalesOrderRow> = {},
): SalesOrderRow {
  const gross = lines.reduce((sum, li) => sum + li.grossAmountCents, 0);
  return {
    id: `${iso}-${lines.map((li) => li.lineUid).join("|")}`,
    order_number: null,
    order_datetime: iso,
    channel: "pos",
    gross_amount: gross,
    tax_amount: 0,
    net_amount: gross,
    discount_amount: 0,
    is_void: false,
    is_refund: false,
    refund_reason: null,
    payment_method: "card",
    source: "square",
    saleLineItems: lines,
    ...overrides,
  };
}

function mixRowFor(lineItem: SalesLineItemRow, label?: string): SalesMixRow {
  return {
    mixKey: mixKeyForLine(lineItem),
    menuItemId: lineItem.menuItemId ?? null,
    label: label ?? lineItem.menuItemName ?? lineItem.lineName,
    quantity: 0,
    revenueCents: 0,
    mapped: lineItem.matchSource !== "unmapped",
  };
}

describe("mixKeyForLine", () => {
  it("uses menuItemId for mapped lines", () => {
    const li = line("Cotoletta", 1, 2450, {
      menuItemId: "menu-1",
      matchSource: "catalog_link",
    });
    expect(mixKeyForLine(li)).toBe("menu-1");
  });

  it("builds the unmapped composite key like the server", () => {
    const li = line("  Cotoletta ", 1, 2450, { squareCatalogObjectId: "SQ1" });
    expect(mixKeyForLine(li)).toBe("unmapped::cotoletta::SQ1");
  });
});

describe("computeSalesItemAnalytics", () => {
  const cotoletta = line("Cotoletta", 1, 2450, { squareCatalogObjectId: "SQ1" });

  it("aggregates quantity, revenue and order counts for the bucket", () => {
    const orders = [
      // 11:00 local (AEST winter = UTC+10)
      order("2026-07-06T01:00:00.000Z", [
        line("Cotoletta", 2, 4900, { squareCatalogObjectId: "SQ1" }),
        line("Chips", 1, 900),
      ]),
      order("2026-07-07T02:00:00.000Z", [
        line("Cotoletta", 1, 2450, { squareCatalogObjectId: "SQ1" }),
      ]),
      order("2026-07-07T03:00:00.000Z", [line("Chips", 1, 900)]),
    ];

    const result = computeSalesItemAnalytics({
      orders,
      mixRow: mixRowFor(cotoletta),
      timezone: TZ,
    });

    expect(result.totalQuantity).toBe(3);
    expect(result.totalRevenueCents).toBe(7350);
    expect(result.orderCount).toBe(2);
    expect(result.totalOrderCount).toBe(3);
    expect(result.attachRatePercent).toBeCloseTo((2 / 3) * 100, 5);
    expect(result.avgUnitPriceCents).toBe(2450);
    expect(result.avgQuantityPerOrder).toBeCloseTo(1.5, 5);
  });

  it("excludes voids and refunds like the sales mix does", () => {
    const orders = [
      order("2026-07-06T01:00:00.000Z", [
        line("Cotoletta", 1, 2450, { squareCatalogObjectId: "SQ1" }),
      ]),
      order(
        "2026-07-06T02:00:00.000Z",
        [line("Cotoletta", 5, 12250, { squareCatalogObjectId: "SQ1" })],
        { is_refund: true },
      ),
      order(
        "2026-07-06T03:00:00.000Z",
        [line("Cotoletta", 5, 12250, { squareCatalogObjectId: "SQ1" })],
        { is_void: true },
      ),
    ];

    const result = computeSalesItemAnalytics({
      orders,
      mixRow: mixRowFor(cotoletta),
      timezone: TZ,
    });

    expect(result.totalQuantity).toBe(1);
    expect(result.totalOrderCount).toBe(1);
  });

  it("counts companions once per order and ranks by co-occurrence", () => {
    const orders = [
      order("2026-07-06T01:00:00.000Z", [
        line("Cotoletta", 1, 2450, { squareCatalogObjectId: "SQ1" }),
        line("Chips", 2, 1800),
        line("Aperol Spritz", 1, 1500),
      ]),
      order("2026-07-07T01:00:00.000Z", [
        line("Cotoletta", 1, 2450, { squareCatalogObjectId: "SQ1" }),
        line("Chips", 1, 900),
      ]),
    ];

    const result = computeSalesItemAnalytics({
      orders,
      mixRow: mixRowFor(cotoletta),
      timezone: TZ,
    });

    expect(result.companions[0]).toMatchObject({
      label: "Chips",
      ordersTogether: 2,
      attachPercent: 100,
    });
    expect(result.companions[1]).toMatchObject({
      label: "Aperol Spritz",
      ordersTogether: 1,
    });
  });

  it("buckets sales into venue-local hours and weekdays", () => {
    // 2026-07-06 is a Monday; 01:00Z = 11:00 in Melbourne (UTC+10).
    const orders = [
      order("2026-07-06T01:00:00.000Z", [
        line("Cotoletta", 1, 2450, { squareCatalogObjectId: "SQ1" }),
      ]),
      // Saturday 11 July, 02:30Z = 12:30 local.
      order("2026-07-11T02:30:00.000Z", [
        line("Cotoletta", 2, 4900, { squareCatalogObjectId: "SQ1" }),
      ]),
    ];

    const result = computeSalesItemAnalytics({
      orders,
      mixRow: mixRowFor(cotoletta),
      timezone: TZ,
    });

    const monday = result.byWeekday.find((point) => point.label === "Mon");
    const saturday = result.byWeekday.find((point) => point.label === "Sat");
    expect(monday?.quantity).toBe(1);
    expect(saturday?.quantity).toBe(2);
    expect(result.peakDayLabel).toBe("Sat");

    const eleven = result.byHour.find((point) => point.hour === 11);
    const twelve = result.byHour.find((point) => point.hour === 12);
    expect(eleven?.quantity).toBe(1);
    expect(twelve?.quantity).toBe(2);
    expect(result.peakHourLabel).toBe("12pm");
  });

  it("fills the daily series continuously between first and last order day", () => {
    const orders = [
      order("2026-07-06T01:00:00.000Z", [
        line("Cotoletta", 1, 2450, { squareCatalogObjectId: "SQ1" }),
      ]),
      order("2026-07-08T01:00:00.000Z", [line("Chips", 1, 900)]),
    ];

    const result = computeSalesItemAnalytics({
      orders,
      mixRow: mixRowFor(cotoletta),
      timezone: TZ,
    });

    expect(result.daily.map((point) => point.dayIso)).toEqual([
      "2026-07-06",
      "2026-07-07",
      "2026-07-08",
    ]);
    expect(result.daily.map((point) => point.quantity)).toEqual([1, 0, 0]);
  });

  it("aggregates modifiers weighted by line quantity", () => {
    const orders = [
      order("2026-07-06T01:00:00.000Z", [
        line("Cotoletta", 2, 4900, {
          squareCatalogObjectId: "SQ1",
          modifiers: [
            { name: "Extra cheese", quantity: 1, amountCents: 200 },
            { name: "No onion", quantity: 1, amountCents: 0 },
          ],
        }),
      ]),
      order("2026-07-07T01:00:00.000Z", [
        line("Cotoletta", 1, 2450, {
          squareCatalogObjectId: "SQ1",
          modifiers: [{ name: "Extra cheese", quantity: 1, amountCents: 100 }],
        }),
        line("Chips", 1, 900, {
          modifiers: [{ name: "Extra salt", quantity: 1, amountCents: 0 }],
        }),
      ]),
    ];

    const result = computeSalesItemAnalytics({
      orders,
      mixRow: mixRowFor(cotoletta),
      timezone: TZ,
    });

    expect(result.modifiers).toEqual([
      {
        label: "Extra cheese",
        timesUsed: 3,
        revenueCents: 300,
        usagePercent: 100,
      },
      {
        label: "No onion",
        timesUsed: 2,
        revenueCents: 0,
        usagePercent: (2 / 3) * 100,
      },
    ]);
  });

  it("splits variations and compares checks with vs without the item", () => {
    const schnitzelSmall = line("Cotoletta", 1, 1950, {
      menuItemId: "menu-1",
      menuItemName: "Cotoletta",
      matchSource: "catalog_link",
      squareVariationName: "Small",
    });
    const schnitzelLarge = line("Cotoletta", 1, 2950, {
      menuItemId: "menu-1",
      menuItemName: "Cotoletta",
      matchSource: "catalog_link",
      squareVariationName: "Large",
    });
    const orders = [
      order("2026-07-06T01:00:00.000Z", [schnitzelSmall, schnitzelLarge]),
      order("2026-07-06T02:00:00.000Z", [line("Chips", 1, 1000)]),
    ];

    const result = computeSalesItemAnalytics({
      orders,
      mixRow: mixRowFor(schnitzelSmall),
      timezone: TZ,
    });

    expect(result.variations).toEqual([
      { label: "Small", quantity: 1, revenueCents: 1950 },
      { label: "Large", quantity: 1, revenueCents: 2950 },
    ]);
    expect(result.avgCheckWithItemCents).toBe(4900);
    expect(result.avgCheckWithoutItemCents).toBe(1000);
  });
});
