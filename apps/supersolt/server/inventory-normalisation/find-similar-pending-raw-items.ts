export type RawItemSimilarityCandidate = {
  id: string;
  supplierId: string;
  rawDescription: string;
  lastUnitPriceCents: number | null;
  normalisationStatus: string;
};

export type SimilarPendingRawItem = {
  id: string;
  rawDescription: string;
  lastUnitPriceCents: number | null;
};

const MIN_SHARED_PREFIX_LENGTH = 12;

function normalizeDescription(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * True when one description is a prefix/extension of the other (same product,
 * different invoice wording) — e.g. "Breast Fillet … 18 HCM" vs "… 200 Pieces @160g".
 */
export function descriptionsLikelySameProduct(a: string, b: string): boolean {
  const na = normalizeDescription(a);
  const nb = normalizeDescription(b);
  if (na === nb) return true;

  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;

  if (longer.startsWith(shorter) && shorter.length >= MIN_SHARED_PREFIX_LENGTH) {
    return true;
  }

  return false;
}

function pricesAlign(
  a: number | null,
  b: number | null,
): boolean {
  if (a == null || b == null) return true;
  return a === b;
}

export function findSimilarPendingRawItems(
  item: RawItemSimilarityCandidate,
  candidates: RawItemSimilarityCandidate[],
): SimilarPendingRawItem[] {
  if (item.normalisationStatus !== "pending") return [];

  return candidates
    .filter((other) => {
      if (other.id === item.id) return false;
      if (other.normalisationStatus !== "pending") return false;
      if (other.supplierId !== item.supplierId) return false;
      if (!pricesAlign(item.lastUnitPriceCents, other.lastUnitPriceCents)) {
        return false;
      }
      return descriptionsLikelySameProduct(
        item.rawDescription,
        other.rawDescription,
      );
    })
    .map((other) => ({
      id: other.id,
      rawDescription: other.rawDescription,
      lastUnitPriceCents: other.lastUnitPriceCents,
    }));
}

export function attachSimilarPendingItems<
  T extends RawItemSimilarityCandidate,
>(items: T[]): Array<T & { similarPendingItems: SimilarPendingRawItem[] }> {
  const pending = items.filter((item) => item.normalisationStatus === "pending");

  return items.map((item) => ({
    ...item,
    similarPendingItems: findSimilarPendingRawItems(item, pending),
  }));
}
