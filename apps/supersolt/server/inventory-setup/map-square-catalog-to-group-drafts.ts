import type { SquareCatalogObjectRaw } from "@/server/square/list-catalog";
import {
  collectCatalogVariations,
  filterVariationForLocation,
  resolveItemCategoryId,
} from "@/server/inventory-setup/map-square-catalog-to-menu-drafts";

/** Tier-2 "subcategory" draft derived from a Square ITEM. */
export type SquareItemGroupDraft = {
  squareItemId: string;
  name: string;
  sectionName: string;
  description: string | null;
  squareRaw: SquareCatalogObjectRaw;
};

function resolveItemDescription(item: SquareCatalogObjectRaw): string | null {
  const data = item.item_data;
  const text = data?.description?.trim() || data?.description_plaintext?.trim();
  return text || null;
}

/**
 * One group per Square ITEM that has at least one variation present at the
 * venue location — keeps groups aligned with imported menu items (no orphans).
 */
export function mapSquareCatalogToGroupDrafts(args: {
  objects: SquareCatalogObjectRaw[];
  locationId: string;
}): SquareItemGroupDraft[] {
  const itemsById = new Map<string, SquareCatalogObjectRaw>();
  const categoriesById = new Map<string, SquareCatalogObjectRaw>();

  for (const object of args.objects) {
    if (!object.id) continue;
    if (object.type === "ITEM") itemsById.set(object.id, object);
    if (object.type === "CATEGORY") categoriesById.set(object.id, object);
  }

  const itemIdsWithVariation = new Set<string>();
  for (const variation of collectCatalogVariations(args.objects)) {
    const itemId = variation.item_variation_data?.item_id?.trim();
    if (!itemId) continue;
    if (filterVariationForLocation({ variation, locationId: args.locationId })) {
      itemIdsWithVariation.add(itemId);
    }
  }

  const drafts: SquareItemGroupDraft[] = [];
  for (const itemId of itemIdsWithVariation) {
    const item = itemsById.get(itemId);
    if (!item) continue;

    const categoryId = resolveItemCategoryId(item);
    const categoryName = categoryId
      ? categoriesById.get(categoryId)?.category_data?.name?.trim()
      : null;

    drafts.push({
      squareItemId: itemId,
      name: item.item_data?.name?.trim() ?? "Unnamed item",
      sectionName: categoryName || "Uncategorised",
      description: resolveItemDescription(item),
      squareRaw: item,
    });
  }

  return drafts;
}
