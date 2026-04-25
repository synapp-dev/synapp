import type { SquareOrderLineDto } from "@/server/square/batch-retrieve-orders";

export type SquareLineMatchSource = "catalog_link" | "name_exact" | "unmapped";

export type ResolvedSquareSaleLine = {
  lineUid: string;
  quantity: number;
  lineName: string;
  grossAmountCents: number;
  currency: string;
  squareCatalogObjectId: string | null;
  /** Square catalog variation label when the API provides it (same item name, different variants). */
  variationName: string | null;
  menuItemId: string | null;
  menuItemName: string | null;
  matchSource: SquareLineMatchSource;
};

export function normalizeMenuLineName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildCatalogObjectToMenuIdMap(
  rows: ReadonlyArray<{ square_catalog_object_id: string; menu_item_id: string }>
): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows) {
    const key = r.square_catalog_object_id.trim();
    if (key && !m.has(key)) {
      m.set(key, r.menu_item_id);
    }
  }
  return m;
}

export function buildMenuNameIndex(
  items: ReadonlyArray<{ id: string; name: string }>
): { byNormalizedName: Map<string, { id: string; name: string }>; idToName: Map<string, string> } {
  const byNormalizedName = new Map<string, { id: string; name: string }>();
  const idToName = new Map<string, string>();

  for (const item of items) {
    idToName.set(item.id, item.name);
    const key = normalizeMenuLineName(item.name);
    if (!key) continue;
    if (!byNormalizedName.has(key)) {
      byNormalizedName.set(key, { id: item.id, name: item.name });
    }
  }

  return { byNormalizedName, idToName };
}

export function resolveSquareOrderLine(args: {
  line: SquareOrderLineDto;
  catalogByObjectId: Map<string, string>;
  byNormalizedName: Map<string, { id: string; name: string }>;
  idToName: Map<string, string>;
}): ResolvedSquareSaleLine {
  const { line, catalogByObjectId, byNormalizedName, idToName } = args;
  const cat = line.squareCatalogObjectId?.trim() ?? null;
  const variationName = line.variationName?.trim() || null;

  if (cat) {
    const linked = catalogByObjectId.get(cat);
    if (linked) {
      return {
        lineUid: line.lineUid,
        quantity: line.quantity,
        lineName: line.lineName,
        grossAmountCents: line.grossAmountCents,
        currency: line.currency,
        squareCatalogObjectId: cat,
        variationName,
        menuItemId: linked,
        menuItemName: idToName.get(linked) ?? null,
        matchSource: "catalog_link",
      };
    }
  }

  const nameKey = normalizeMenuLineName(line.lineName);
  const byName = nameKey ? byNormalizedName.get(nameKey) : undefined;
  if (byName) {
    return {
      lineUid: line.lineUid,
      quantity: line.quantity,
      lineName: line.lineName,
      grossAmountCents: line.grossAmountCents,
      currency: line.currency,
      squareCatalogObjectId: cat,
      variationName,
      menuItemId: byName.id,
      menuItemName: byName.name,
      matchSource: "name_exact",
    };
  }

  return {
    lineUid: line.lineUid,
    quantity: line.quantity,
    lineName: line.lineName,
    grossAmountCents: line.grossAmountCents,
    currency: line.currency,
    squareCatalogObjectId: cat,
    variationName,
    menuItemId: null,
    menuItemName: null,
    matchSource: "unmapped",
  };
}
