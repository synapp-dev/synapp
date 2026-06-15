import type { SupplierRawItemSummary } from "@/entities/supplier-raw-items/model/types";

// Mirrors the server's descriptionsLikelySameProduct (find-similar-pending-raw-items.ts):
// one description being a prefix/extension of another means same product, different
// invoice wording — e.g. "Breast Fillet Skin Off 18 HCM" vs "… (200 pieces @160g)".
const MIN_SHARED_PREFIX_LENGTH = 12;

function normalize(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, " ");
}

function sameProduct(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  return longer.startsWith(shorter) && shorter.length >= MIN_SHARED_PREFIX_LENGTH;
}

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
      sameProduct(g.representative.rawDescription, item.rawDescription),
    );
    if (group) group.variants.push(item);
    else groups.push({ representative: item, variants: [item] });
  }
  return groups;
}
