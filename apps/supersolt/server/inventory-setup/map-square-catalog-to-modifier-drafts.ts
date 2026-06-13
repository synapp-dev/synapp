import type { SquareCatalogObjectRaw } from "@/server/square/list-catalog";
import {
  collectCatalogVariations,
  filterVariationForLocation,
} from "@/server/inventory-setup/map-square-catalog-to-menu-drafts";

export type SquareModifierListDraft = {
  squareModifierListId: string;
  name: string;
  selectionType: "single" | "multi";
  minSelected: number | null;
  maxSelected: number | null;
  squareRaw: SquareCatalogObjectRaw;
};

export type SquareModifierDraft = {
  squareModifierListId: string;
  squareModifierId: string;
  name: string;
  priceCents: number;
  squareRaw: SquareCatalogObjectRaw;
};

/** Item → modifier-list attachment from `ITEM.item_data.modifier_list_info`. */
export type SquareGroupModifierLink = {
  squareItemId: string;
  squareModifierListId: string;
  enabled: boolean;
  minSelected: number | null;
  maxSelected: number | null;
};

export type SquareModifierDrafts = {
  lists: SquareModifierListDraft[];
  modifiers: SquareModifierDraft[];
  links: SquareGroupModifierLink[];
};

function normaliseSelectionType(value: string | undefined): "single" | "multi" {
  return value?.trim().toUpperCase() === "SINGLE" ? "single" : "multi";
}

function nullableInt(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Collect MODIFIER objects from both standalone catalog objects and the
 * `modifiers` array embedded on a MODIFIER_LIST, keyed by id (dedupe).
 * The embedded form back-fills `modifier_list_id` from its parent list.
 */
function collectModifiers(
  objects: SquareCatalogObjectRaw[],
): SquareCatalogObjectRaw[] {
  const byId = new Map<string, SquareCatalogObjectRaw>();

  for (const object of objects) {
    if (object.type === "MODIFIER" && object.id) {
      byId.set(object.id, object);
    }
    if (object.type === "MODIFIER_LIST") {
      for (const modifier of object.modifier_list_data?.modifiers ?? []) {
        if (typeof modifier !== "object") continue;
        if (modifier.type !== "MODIFIER" || !modifier.id) continue;
        const existing = byId.get(modifier.id) as SquareCatalogObjectRaw | undefined;
        const merged: SquareCatalogObjectRaw = existing ?? modifier;
        if (!merged.modifier_data?.modifier_list_id && object.id) {
          merged.modifier_data = {
            ...merged.modifier_data,
            modifier_list_id: object.id,
          };
        }
        byId.set(modifier.id, merged);
      }
    }
  }

  return [...byId.values()];
}

export function mapSquareCatalogToModifierDrafts(args: {
  objects: SquareCatalogObjectRaw[];
  locationId: string;
}): SquareModifierDrafts {
  const lists: SquareModifierListDraft[] = [];

  for (const object of args.objects) {
    if (object.type !== "MODIFIER_LIST" || !object.id) continue;
    const data = object.modifier_list_data;
    lists.push({
      squareModifierListId: object.id,
      name: data?.name?.trim() ?? "Modifiers",
      selectionType: normaliseSelectionType(data?.selection_type),
      minSelected: nullableInt(data?.min_selected_modifiers),
      maxSelected: nullableInt(data?.max_selected_modifiers),
      squareRaw: object,
    });
  }

  const modifiers: SquareModifierDraft[] = [];
  for (const object of collectModifiers(args.objects)) {
    if (!object.id) continue;
    const data = object.modifier_data;
    const listId = data?.modifier_list_id?.trim();
    if (!listId) continue;
    modifiers.push({
      squareModifierListId: listId,
      squareModifierId: object.id,
      name: data?.name?.trim() ?? "Modifier",
      priceCents: Math.max(0, Math.round(Number(data?.price_money?.amount ?? 0))),
      squareRaw: object,
    });
  }

  // Item → list links, only for items with a variation at the venue location.
  const itemIdsWithVariation = new Set<string>();
  for (const variation of collectCatalogVariations(args.objects)) {
    const itemId = variation.item_variation_data?.item_id?.trim();
    if (!itemId) continue;
    if (filterVariationForLocation({ variation, locationId: args.locationId })) {
      itemIdsWithVariation.add(itemId);
    }
  }

  const links: SquareGroupModifierLink[] = [];
  for (const object of args.objects) {
    if (object.type !== "ITEM" || !object.id) continue;
    if (!itemIdsWithVariation.has(object.id)) continue;
    for (const info of object.item_data?.modifier_list_info ?? []) {
      const listId = info.modifier_list_id?.trim();
      if (!listId) continue;
      links.push({
        squareItemId: object.id,
        squareModifierListId: listId,
        enabled: info.enabled !== false,
        minSelected: nullableInt(info.min_selected_modifiers),
        maxSelected: nullableInt(info.max_selected_modifiers),
      });
    }
  }

  return { lists, modifiers, links };
}
