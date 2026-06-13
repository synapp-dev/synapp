import { describe, expect, it } from "vitest";
import { mapSquareCatalogToGroupDrafts } from "@/server/inventory-setup/map-square-catalog-to-group-drafts";
import type { SquareCatalogObjectRaw } from "@/server/square/list-catalog";

function variationFor(itemId: string): SquareCatalogObjectRaw {
  return {
    type: "ITEM_VARIATION",
    id: `var-${itemId}`,
    item_variation_data: { item_id: itemId, price_money: { amount: 400 } },
  };
}

describe("mapSquareCatalogToGroupDrafts", () => {
  it("resolves an ITEM into a group with category section and description", () => {
    const objects: SquareCatalogObjectRaw[] = [
      { type: "CATEGORY", id: "cat-drinks", category_data: { name: "DRINKS" } },
      {
        type: "ITEM",
        id: "item-juice",
        item_data: {
          name: "JUICE",
          description: "Freshly squeezed",
          reporting_category: { id: "cat-drinks" },
        },
      },
      variationFor("item-juice"),
    ];

    const drafts = mapSquareCatalogToGroupDrafts({ objects, locationId: "loc-a" });

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      squareItemId: "item-juice",
      name: "JUICE",
      sectionName: "DRINKS",
      description: "Freshly squeezed",
    });
    expect(drafts[0]?.squareRaw.id).toBe("item-juice");
  });

  it("falls back to Uncategorised and plaintext description", () => {
    const objects: SquareCatalogObjectRaw[] = [
      {
        type: "ITEM",
        id: "item-cola",
        item_data: { name: "COCA COLA", description_plaintext: "Can, 375ml" },
      },
      variationFor("item-cola"),
    ];

    const drafts = mapSquareCatalogToGroupDrafts({ objects, locationId: "loc-a" });

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      sectionName: "Uncategorised",
      description: "Can, 375ml",
    });
  });

  it("emits null description when none is present", () => {
    const objects: SquareCatalogObjectRaw[] = [
      { type: "ITEM", id: "item-water", item_data: { name: "WATER" } },
      variationFor("item-water"),
    ];

    const drafts = mapSquareCatalogToGroupDrafts({ objects, locationId: "loc-a" });
    expect(drafts[0]?.description).toBeNull();
  });

  it("skips items with no variation at the venue location", () => {
    const objects: SquareCatalogObjectRaw[] = [
      { type: "ITEM", id: "item-elsewhere", item_data: { name: "ELSEWHERE" } },
      {
        type: "ITEM_VARIATION",
        id: "var-elsewhere",
        present_at_all_locations: false,
        present_at_location_ids: ["loc-b"],
        item_variation_data: { item_id: "item-elsewhere", price_money: { amount: 400 } },
      },
    ];

    expect(mapSquareCatalogToGroupDrafts({ objects, locationId: "loc-a" })).toHaveLength(0);
  });
});
