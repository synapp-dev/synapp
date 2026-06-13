import type { SquareCatalogObjectRaw } from "@/server/square/list-catalog";

export type SquareMenuItemDraft = {
  squareCatalogObjectId: string;
  squareItemId: string;
  name: string;
  sectionName: string;
  priceCents: number;
  showOnMenu: boolean;
  status: "active" | "inactive";
  squareRaw: SquareCatalogObjectRaw;
};

type LocationPresenceFields = {
  present_at_all_locations?: boolean;
  present_at_location_ids?: string[];
  absent_at_location_ids?: string[];
};

/** Square defaults `present_at_all_locations` to true when omitted. */
export function isCatalogObjectAtLocation(
  object: LocationPresenceFields,
  locationId: string,
): boolean {
  const presentAtAll = object.present_at_all_locations !== false;
  const presentIds = object.present_at_location_ids ?? [];
  const absentIds = object.absent_at_location_ids ?? [];

  if (presentAtAll) {
    return !absentIds.includes(locationId);
  }
  return presentIds.includes(locationId);
}

function readLocationPresence(object: SquareCatalogObjectRaw): LocationPresenceFields {
  const nested = object.item_variation_data;
  return {
    present_at_all_locations:
      object.present_at_all_locations ?? nested?.present_at_all_locations,
    present_at_location_ids:
      object.present_at_location_ids ?? nested?.present_at_location_ids,
    absent_at_location_ids: object.absent_at_location_ids,
  };
}

export function collectCatalogVariations(
  objects: SquareCatalogObjectRaw[],
): SquareCatalogObjectRaw[] {
  const byId = new Map<string, SquareCatalogObjectRaw>();

  for (const object of objects) {
    if (object.type === "ITEM_VARIATION" && object.id) {
      byId.set(object.id, object);
    }
    if (object.type === "ITEM") {
      for (const variation of object.item_data?.variations ?? []) {
        if (typeof variation === "object" && variation.type === "ITEM_VARIATION" && variation.id) {
          byId.set(variation.id, variation);
        }
      }
    }
  }

  return [...byId.values()];
}

/**
 * Square deprecated `item_data.category_id` (2023-12-13). The dashboard's
 * "Reporting category" maps to `reporting_category`; fall back to the first
 * assigned category, then the legacy field for older catalogs.
 */
export function resolveItemCategoryId(
  item: SquareCatalogObjectRaw | undefined,
): string | null {
  const data = item?.item_data;
  if (!data) return null;

  const reportingId = data.reporting_category?.id?.trim();
  if (reportingId) return reportingId;

  const firstCategoryId = data.categories?.find((category) => category.id?.trim())?.id?.trim();
  if (firstCategoryId) return firstCategoryId;

  const legacyId = data.category_id?.trim();
  return legacyId || null;
}

export function buildMenuItemName(itemName: string, variationName: string | null): string {
  const base = itemName.trim();
  const variation = variationName?.trim() ?? "";
  if (!variation || variation.toLowerCase() === "regular" || variation === base) {
    return base;
  }
  return `${base} — ${variation}`;
}

export function filterVariationForLocation(args: {
  variation: SquareCatalogObjectRaw;
  locationId: string;
}): { included: boolean; soldOut: boolean; priceCents: number } | null {
  const data = args.variation.item_variation_data;
  if (!data) return null;

  if (!isCatalogObjectAtLocation(readLocationPresence(args.variation), args.locationId)) {
    return null;
  }

  const override = (data.location_overrides ?? []).find(
    (row) => row.location_id === args.locationId,
  );
  const soldOut = override?.sold_out === true;
  const amount =
    override?.price_money?.amount ??
    data.price_money?.amount ??
    0;

  return {
    included: true,
    soldOut,
    priceCents: Math.max(0, Math.round(Number(amount))),
  };
}

export function mapSquareCatalogToMenuDrafts(args: {
  objects: SquareCatalogObjectRaw[];
  locationId: string;
}): SquareMenuItemDraft[] {
  const itemsById = new Map<string, SquareCatalogObjectRaw>();
  const categoriesById = new Map<string, SquareCatalogObjectRaw>();

  for (const object of args.objects) {
    if (!object.id) continue;
    if (object.type === "ITEM") {
      itemsById.set(object.id, object);
    }
    if (object.type === "CATEGORY") {
      categoriesById.set(object.id, object);
    }
  }

  const drafts: SquareMenuItemDraft[] = [];
  const variations = collectCatalogVariations(args.objects);

  for (const object of variations) {
    if (!object.id) continue;
    const availability = filterVariationForLocation({
      variation: object,
      locationId: args.locationId,
    });
    if (!availability) continue;

    const variationData = object.item_variation_data;
    const itemId = variationData?.item_id?.trim();
    if (!itemId) continue;

    const parentItem = itemsById.get(itemId);
    const itemName = parentItem?.item_data?.name?.trim() ?? "Unnamed item";
    const variationName = variationData?.name?.trim() ?? null;
    const categoryId = resolveItemCategoryId(parentItem);
    const categoryName = categoryId
      ? categoriesById.get(categoryId)?.category_data?.name?.trim()
      : null;

    drafts.push({
      squareCatalogObjectId: object.id,
      squareItemId: itemId,
      name: buildMenuItemName(itemName, variationName),
      sectionName: categoryName || "Uncategorised",
      priceCents: availability.priceCents,
      showOnMenu: !availability.soldOut,
      status: availability.soldOut ? "inactive" : "active",
      squareRaw: object,
    });
  }

  return drafts;
}

export function computeMissingFromSquare(args: {
  linkedCatalogObjectIds: string[];
  seenCatalogObjectIds: Set<string>;
}): Set<string> {
  const missing = new Set<string>();
  for (const id of args.linkedCatalogObjectIds) {
    if (!args.seenCatalogObjectIds.has(id)) {
      missing.add(id);
    }
  }
  return missing;
}
