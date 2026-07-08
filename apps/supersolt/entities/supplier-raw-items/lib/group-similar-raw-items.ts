import type { SupplierRawItemSummary } from "@/entities/supplier-raw-items/model/types";
// Pure helper (no server-only deps); the queue query hook already imports from
// this module client-side. One implementation so client/server can't drift.
import { descriptionsLikelySameProduct } from "@/server/inventory-normalisation/find-similar-pending-raw-items";

export type RawItemGroup = {
  /** Shortest (base) description — the canonical product line. */
  representative: SupplierRawItemSummary;
  /** All raw items in the group, including the representative. */
  variants: SupplierRawItemSummary[];
};

/**
 * Cluster raw items that are the same product in different invoice wording /
 * order quantities. Shortest description first so the bare product name becomes
 * the representative and its quantity variants attach to it.
 */
export function groupSimilarRawItems(
  items: SupplierRawItemSummary[],
): RawItemGroup[] {
  const sorted = [...items].sort(
    (a, b) => a.rawDescription.length - b.rawDescription.length,
  );
  const groups: RawItemGroup[] = [];
  for (const item of sorted) {
    const group = groups.find((g) =>
      descriptionsLikelySameProduct(g.representative.rawDescription, item.rawDescription),
    );
    if (group) group.variants.push(item);
    else groups.push({ representative: item, variants: [item] });
  }
  return groups;
}
