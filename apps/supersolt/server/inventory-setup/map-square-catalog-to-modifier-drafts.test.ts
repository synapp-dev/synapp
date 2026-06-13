import { describe, expect, it } from "vitest";
import { mapSquareCatalogToModifierDrafts } from "@/server/inventory-setup/map-square-catalog-to-modifier-drafts";
import type { SquareCatalogObjectRaw } from "@/server/square/list-catalog";

describe("mapSquareCatalogToModifierDrafts", () => {
  it("maps a MODIFIER_LIST with embedded modifiers", () => {
    const objects: SquareCatalogObjectRaw[] = [
      {
        type: "MODIFIER_LIST",
        id: "mlist-milk",
        modifier_list_data: {
          name: "Milk",
          selection_type: "SINGLE",
          modifiers: [
            {
              type: "MODIFIER",
              id: "mod-oat",
              modifier_data: { name: "Oat", price_money: { amount: 80 } },
            },
            {
              type: "MODIFIER",
              id: "mod-soy",
              modifier_data: { name: "Soy", price_money: { amount: 60 } },
            },
          ],
        },
      },
    ];

    const { lists, modifiers, links } = mapSquareCatalogToModifierDrafts({
      objects,
      locationId: "loc-a",
    });

    expect(lists).toHaveLength(1);
    expect(lists[0]).toMatchObject({
      squareModifierListId: "mlist-milk",
      name: "Milk",
      selectionType: "single",
    });
    expect(modifiers).toHaveLength(2);
    expect(modifiers[0]).toMatchObject({
      squareModifierListId: "mlist-milk",
      squareModifierId: "mod-oat",
      name: "Oat",
      priceCents: 80,
    });
    expect(links).toHaveLength(0);
  });

  it("defaults selection type to multi and collects standalone MODIFIER objects", () => {
    const objects: SquareCatalogObjectRaw[] = [
      {
        type: "MODIFIER_LIST",
        id: "mlist-addons",
        modifier_list_data: { name: "Add ons" },
      },
      {
        type: "MODIFIER",
        id: "mod-bacon",
        modifier_data: {
          name: "Bacon",
          price_money: { amount: 250 },
          modifier_list_id: "mlist-addons",
        },
      },
    ];

    const { lists, modifiers } = mapSquareCatalogToModifierDrafts({
      objects,
      locationId: "loc-a",
    });

    expect(lists[0]?.selectionType).toBe("multi");
    expect(modifiers).toHaveLength(1);
    expect(modifiers[0]).toMatchObject({
      squareModifierListId: "mlist-addons",
      squareModifierId: "mod-bacon",
      priceCents: 250,
    });
  });

  it("links an item to its modifier lists when the item is sold at the location", () => {
    const objects: SquareCatalogObjectRaw[] = [
      {
        type: "MODIFIER_LIST",
        id: "mlist-addons",
        modifier_list_data: { name: "Add ons" },
      },
      {
        type: "ITEM",
        id: "item-burger",
        item_data: {
          name: "Burger",
          modifier_list_info: [
            {
              modifier_list_id: "mlist-addons",
              enabled: true,
              min_selected_modifiers: 0,
              max_selected_modifiers: 3,
            },
          ],
        },
      },
      {
        type: "ITEM_VARIATION",
        id: "var-burger",
        item_variation_data: { item_id: "item-burger", price_money: { amount: 1200 } },
      },
    ];

    const { links } = mapSquareCatalogToModifierDrafts({ objects, locationId: "loc-a" });

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      squareItemId: "item-burger",
      squareModifierListId: "mlist-addons",
      enabled: true,
      minSelected: 0,
      maxSelected: 3,
    });
  });

  it("omits links for items not sold at the venue location", () => {
    const objects: SquareCatalogObjectRaw[] = [
      {
        type: "ITEM",
        id: "item-elsewhere",
        item_data: {
          name: "Elsewhere",
          modifier_list_info: [{ modifier_list_id: "mlist-addons" }],
        },
      },
      {
        type: "ITEM_VARIATION",
        id: "var-elsewhere",
        present_at_all_locations: false,
        present_at_location_ids: ["loc-b"],
        item_variation_data: { item_id: "item-elsewhere", price_money: { amount: 1200 } },
      },
    ];

    const { links } = mapSquareCatalogToModifierDrafts({ objects, locationId: "loc-a" });
    expect(links).toHaveLength(0);
  });
});
