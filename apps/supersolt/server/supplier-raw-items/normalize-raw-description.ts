/** Normalise supplier invoice wording for dedupe keys. */
export function normalizeRawDescription(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Count words that all just mean "one of" — collapsed to a single canonical unit
 *  so the same product invoiced as "units" / "ea" / "piece" doesn't split. */
export const GENERIC_COUNT_UNITS = new Set([
  "unit",
  "units",
  "ea",
  "each",
  "pc",
  "pcs",
  "piece",
  "pieces",
  "qty",
  "item",
  "items",
  "x",
]);

/** Real pack/measure units that genuinely distinguish a product (a bag vs an
 *  each, a kg vs a case) and must NEVER be collapsed — even if a supplier happens
 *  to repeat the word in the description. */
export const MEANINGFUL_PACK_UNITS = new Set([
  "kg", "g", "mg", "l", "ml", "mls", "lt", "ltr", "litre", "liter", "cl",
  "oz", "lb", "kilo", "kilos", "gram", "grams",
  "dozen", "doz", "case", "box", "bag", "carton", "ctn", "tray", "pack",
  "packet", "pkt", "punnet", "bunch", "sleeve", "roll", "tub", "jar",
  "bottle", "btl", "can", "tin", "tins", "drum", "pail", "sack", "crate", "block", "wheel",
]);

/**
 * Normalise the unit/pack so the same product priced under different *real* packs
 * (e.g. "each" vs "bag") dedupes to distinct raw items, while spurious unit
 * labelling doesn't split one product into several.
 *
 * Collapses to the canonical "each":
 *  - generic count words ("units", "ea", "piece"…), and
 *  - a bare word that just echoes the product name — e.g. unit "slab" on
 *    "Focaccia - Slab", which carries no pack information.
 *
 * Keeps real measure/pack units as-is, and leaves a missing unit empty (so a
 * no-unit line stays distinct from an explicit "each").
 */
export function normalizeRawUnit(
  unit: string | null | undefined,
  description?: string | null,
): string {
  const cleaned = (unit ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  if (cleaned === "") return "";
  if (GENERIC_COUNT_UNITS.has(cleaned)) return "each";
  if (MEANINGFUL_PACK_UNITS.has(cleaned)) return cleaned;
  // A plain alphabetic word already present in the description (and not a real
  // pack unit) is redundant labelling, not a size — treat it as a plain count.
  if (description && /^[a-z]+$/.test(cleaned)) {
    const tokens = normalizeRawDescription(description)
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    if (tokens.includes(cleaned)) return "each";
  }
  return cleaned;
}

export function buildRawItemDedupeKey(
  supplierId: string,
  rawDescription: string,
  rawUnit?: string | null,
): string {
  return `${supplierId}:${normalizeRawDescription(rawDescription)}:${normalizeRawUnit(rawUnit, rawDescription)}`;
}
