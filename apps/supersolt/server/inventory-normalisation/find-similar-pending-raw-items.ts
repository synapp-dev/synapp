import {
  GENERIC_COUNT_UNITS,
  MEANINGFUL_PACK_UNITS,
} from "@/server/supplier-raw-items/normalize-raw-description";
import { levenshtein } from "@/server/supplier-raw-items/review-clustering";

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

// A parenthesised unit/pack hint — "(l)", "(Tins)", "(6)" — is invoice
// formatting noise for similarity purposes: it's exactly the "different pack
// size of the same product" distinction the queue groups as variants, not a
// reason to treat "Garlic Oil" and "Garlic Oil (l)" as different products.
const UNIT_HINT_WORDS = [...GENERIC_COUNT_UNITS, ...MEANINGFUL_PACK_UNITS].join("|");
const UNIT_HINT_IN_PARENS_RE = new RegExp(
  `\\(\\s*(?:\\d+\\s*)?(?:${UNIT_HINT_WORDS})\\s*\\)|\\(\\s*\\d+\\s*\\)`,
  "gi",
);

function normalizeDescription(description: string): string {
  // Brace tags ({Tibaldi}, {Senza}) and asterisk runs (**** MILK LAB ****) are
  // brand/origin decoration, not product identity — the same noise parsePack
  // (review-clustering.ts) strips before clustering. Punctuation is invoice
  // formatting noise too — "W/ DISPENSER" vs "W/-DISPENSER" is the same
  // product, so any run of non-alphanumeric characters collapses to one space.
  return description
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\*+/g, " ")
    .replace(UNIT_HINT_IN_PARENS_RE, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Typo tolerance only kicks in on descriptions long enough that a handful of
// stray characters ("graseproof" vs "greaseproof", "greaseproof" vs "grease
// proof") can't coincidentally make two different short products look alike.
const FUZZY_MIN_LENGTH = 20;
const FUZZY_MAX_DISTANCE = 1;
// "Pretty much the same price" — text similarity alone can't tell a typo from
// a meaningful difference ("Skin Off" vs "Skin On"), so a close price is
// required to corroborate before the typo tier fires.
const FUZZY_PRICE_TOLERANCE_RATIO = 0.03;

function pricesRoughlyMatch(
  a: number | null | undefined,
  b: number | null | undefined,
): boolean {
  if (a == null || b == null || a <= 0 || b <= 0) return false;
  if (a === b) return true;
  return Math.abs(a - b) / Math.max(a, b) <= FUZZY_PRICE_TOLERANCE_RATIO;
}

/**
 * True when one description is a prefix/extension of the other (same product,
 * different invoice wording) — e.g. "Breast Fillet … 18 HCM" vs "… 200 Pieces @160g" —
 * or a near-identical long description at (roughly) the same price, i.e. a
 * typo or stray space rather than a different product — e.g. "PTD GRASEPROOF"
 * vs "PTD GREASEPROOF".
 */
export function descriptionsLikelySameProduct(
  a: string,
  b: string,
  priceCentsA?: number | null,
  priceCentsB?: number | null,
): boolean {
  const na = normalizeDescription(a);
  const nb = normalizeDescription(b);
  if (na === nb) return true;

  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;

  if (longer.startsWith(shorter) && shorter.length >= MIN_SHARED_PREFIX_LENGTH) {
    return true;
  }

  if (
    na.length >= FUZZY_MIN_LENGTH &&
    nb.length >= FUZZY_MIN_LENGTH &&
    pricesRoughlyMatch(priceCentsA, priceCentsB) &&
    levenshtein(na, nb) <= FUZZY_MAX_DISTANCE
  ) {
    return true;
  }

  return false;
}

/**
 * How many distinct products a set of raw-item descriptions represents, after
 * folding unit-size and wording variants of the same product together —
 * connected components under the same relation the normalisation queue's
 * accordion grouping uses, so "unique" here always agrees with what the queue
 * shows as one product. Six EGGS rows in different units count once.
 */
export function countUniqueProducts(
  items: Array<{ description: string; priceCents?: number | null }>,
): number {
  const normalized = items.map((item) => normalizeDescription(item.description));
  const parent = normalized.map((_, index) => index);
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root]!;
    let cursor = i;
    while (parent[cursor] !== root) {
      const next = parent[cursor]!;
      parent[cursor] = root;
      cursor = next;
    }
    return root;
  };

  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const na = normalized[i]!;
      const nb = normalized[j]!;
      const same =
        na === nb ||
        (() => {
          const shorter = na.length <= nb.length ? na : nb;
          const longer = na.length <= nb.length ? nb : na;
          return (
            longer.startsWith(shorter) &&
            shorter.length >= MIN_SHARED_PREFIX_LENGTH
          );
        })() ||
        (na.length >= FUZZY_MIN_LENGTH &&
          nb.length >= FUZZY_MIN_LENGTH &&
          pricesRoughlyMatch(items[i]!.priceCents, items[j]!.priceCents) &&
          levenshtein(na, nb) <= FUZZY_MAX_DISTANCE);
      if (same) {
        const ri = find(i);
        const rj = find(j);
        if (ri !== rj) parent[Math.max(ri, rj)] = Math.min(ri, rj);
      }
    }
  }

  const roots = new Set<number>();
  for (let i = 0; i < normalized.length; i++) roots.add(find(i));
  return roots.size;
}

export function findSimilarPendingRawItems(
  item: RawItemSimilarityCandidate,
  candidates: RawItemSimilarityCandidate[],
): SimilarPendingRawItem[] {
  if (item.normalisationStatus !== "pending") return [];

  // No price gate on the exact/prefix tiers: raw items are unique on
  // (supplier, description, unit), so two same-product rows at different
  // prices are different pack sizes (or unit-wording drift), not different
  // products — price is history, not identity. Matches the wizard's
  // groupPendingQueueItems semantics. The typo tier is the exception — see
  // descriptionsLikelySameProduct.
  return candidates
    .filter((other) => {
      if (other.id === item.id) return false;
      if (other.normalisationStatus !== "pending") return false;
      if (other.supplierId !== item.supplierId) return false;
      return descriptionsLikelySameProduct(
        item.rawDescription,
        other.rawDescription,
        item.lastUnitPriceCents,
        other.lastUnitPriceCents,
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
