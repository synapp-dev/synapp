import { describe, expect, it } from "vitest";
import {
  buildMenuItemName,
  collectCatalogVariations,
  filterVariationForLocation,
  isCatalogObjectAtLocation,
  mapSquareCatalogToMenuDrafts,
  resolveItemCategoryId,
} from "@/server/inventory-setup/map-square-catalog-to-menu-drafts";
import type { SquareCatalogObjectRaw } from "@/server/square/list-catalog";

describe("buildMenuItemName", () => {
  it("uses item name only for regular variation", () => {
    expect(buildMenuItemName("Cappuccino", "Regular")).toBe("Cappuccino");
  });

  it("combines item and variation when different", () => {
    expect(buildMenuItemName("Cappuccino", "Large")).toBe("Cappuccino — Large");
  });
});

describe("isCatalogObjectAtLocation", () => {
  it("defaults to all locations when fields are omitted", () => {
    expect(isCatalogObjectAtLocation({}, "loc-a")).toBe(true);
  });

  it("honours absent_at_location_ids when present everywhere", () => {
    expect(
      isCatalogObjectAtLocation(
        { present_at_all_locations: true, absent_at_location_ids: ["loc-b"] },
        "loc-a",
      ),
    ).toBe(true);
    expect(
      isCatalogObjectAtLocation(
        { present_at_all_locations: true, absent_at_location_ids: ["loc-b"] },
        "loc-b",
      ),
    ).toBe(false);
  });

  it("requires explicit location ids when not present everywhere", () => {
    expect(
      isCatalogObjectAtLocation(
        { present_at_all_locations: false, present_at_location_ids: ["loc-a"] },
        "loc-a",
      ),
    ).toBe(true);
    expect(
      isCatalogObjectAtLocation(
        { present_at_all_locations: false, present_at_location_ids: ["loc-a"] },
        "loc-b",
      ),
    ).toBe(false);
  });
});

describe("filterVariationForLocation", () => {
  it("includes variation at venue location via root-level ids", () => {
    const variation: SquareCatalogObjectRaw = {
      type: "ITEM_VARIATION",
      id: "var-1",
      present_at_location_ids: ["loc-a"],
      present_at_all_locations: false,
      item_variation_data: {
        price_money: { amount: 450 },
      },
    };

    expect(filterVariationForLocation({ variation, locationId: "loc-a" })?.included).toBe(
      true,
    );
  });

  it("includes variation with no location fields (Square default)", () => {
    const variation: SquareCatalogObjectRaw = {
      type: "ITEM_VARIATION",
      id: "var-1",
      item_variation_data: {
        price_money: { amount: 450 },
      },
    };

    expect(filterVariationForLocation({ variation, locationId: "loc-a" })?.included).toBe(
      true,
    );
  });

  it("excludes variation at other locations", () => {
    const variation: SquareCatalogObjectRaw = {
      type: "ITEM_VARIATION",
      id: "var-1",
      present_at_location_ids: ["loc-a"],
      present_at_all_locations: false,
      item_variation_data: {
        price_money: { amount: 450 },
      },
    };

    expect(filterVariationForLocation({ variation, locationId: "loc-b" })).toBeNull();
  });
});

describe("resolveItemCategoryId", () => {
  it("prefers reporting_category over categories and legacy field", () => {
    expect(
      resolveItemCategoryId({
        type: "ITEM",
        id: "item-1",
        item_data: {
          name: "Caprese",
          category_id: "legacy",
          categories: [{ id: "cat-list" }],
          reporting_category: { id: "cat-reporting" },
        },
      }),
    ).toBe("cat-reporting");
  });

  it("falls back to first category, then legacy category_id", () => {
    expect(
      resolveItemCategoryId({
        type: "ITEM",
        id: "item-1",
        item_data: { name: "Caprese", categories: [{ id: "cat-list" }] },
      }),
    ).toBe("cat-list");

    expect(
      resolveItemCategoryId({
        type: "ITEM",
        id: "item-1",
        item_data: { name: "Caprese", category_id: "legacy" },
      }),
    ).toBe("legacy");
  });

  it("returns null when no category is set", () => {
    expect(
      resolveItemCategoryId({ type: "ITEM", id: "item-1", item_data: { name: "Caprese" } }),
    ).toBeNull();
  });
});

describe("collectCatalogVariations", () => {
  it("includes embedded item variations", () => {
    const embedded: SquareCatalogObjectRaw = {
      type: "ITEM_VARIATION",
      id: "var-embedded",
      item_variation_data: { item_id: "item-1", price_money: { amount: 500 } },
    };
    const objects: SquareCatalogObjectRaw[] = [
      {
        type: "ITEM",
        id: "item-1",
        item_data: { name: "Latte", variations: [embedded] },
      },
    ];

    expect(collectCatalogVariations(objects)).toHaveLength(1);
    expect(collectCatalogVariations(objects)[0]?.id).toBe("var-embedded");
  });
});

describe("mapSquareCatalogToMenuDrafts", () => {
  it("maps category and availability", () => {
    const objects: SquareCatalogObjectRaw[] = [
      {
        type: "CATEGORY",
        id: "cat-1",
        category_data: { name: "PANINI" },
      },
      {
        type: "ITEM",
        id: "item-1",
        item_data: { name: "Caprese", reporting_category: { id: "cat-1" } },
      },
      {
        type: "ITEM_VARIATION",
        id: "var-1",
        present_at_all_locations: true,
        item_variation_data: {
          item_id: "item-1",
          name: "Regular",
          price_money: { amount: 1800 },
          location_overrides: [{ location_id: "loc-a", sold_out: true }],
        },
      },
    ];

    const drafts = mapSquareCatalogToMenuDrafts({ objects, locationId: "loc-a" });
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      name: "Caprese",
      sectionName: "PANINI",
      priceCents: 1800,
      showOnMenu: false,
      squareCatalogObjectId: "var-1",
      squareItemId: "item-1",
    });
    expect(drafts[0]?.squareRaw.id).toBe("var-1");
  });

  it("imports variations with omitted location fields", () => {
    const objects: SquareCatalogObjectRaw[] = [
      {
        type: "ITEM",
        id: "item-1",
        item_data: { name: "Cappuccino" },
      },
      {
        type: "ITEM_VARIATION",
        id: "var-1",
        item_variation_data: {
          item_id: "item-1",
          name: "Regular",
          price_money: { amount: 500 },
        },
      },
    ];

    const drafts = mapSquareCatalogToMenuDrafts({ objects, locationId: "hawthorn" });
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.name).toBe("Cappuccino");
  });
});
