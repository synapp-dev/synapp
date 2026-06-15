export type PackHint = {
  packLabel: string;
  unitsPerPack: number;
  packUnit: "g" | "kg" | "mL" | "L" | "each";
};

// "@160g", "@ 1 kg", "@500ml" — the per-piece measurable content suppliers
// tack onto invoice descriptions.
const PER_UNIT_RE = /@\s*(\d+(?:\.\d+)?)\s*(kg|g|mls|ml|ltr|lt|l)\b/i;

function normalizeUnit(raw: string): PackHint["packUnit"] | null {
  switch (raw.toLowerCase()) {
    case "g":
      return "g";
    case "kg":
      return "kg";
    case "ml":
    case "mls":
      return "mL";
    case "l":
    case "lt":
    case "ltr":
      return "L";
    default:
      return null;
  }
}

function detectLabel(description: string): string {
  if (/\b(pieces?|pcs|fillets?)\b/i.test(description)) return "piece";
  return "each";
}

/**
 * Deterministically pull a per-unit pack size out of invoice wording like
 * "Breast Fillet … (150 pieces @160g)" → 160 g per piece. Scans a product and
 * its quantity variants and returns the first confident match, so a piece-based
 * supplier line auto-fills the normalisation pack fields instead of being guessed.
 */
export function extractPackHint(descriptions: string[]): PackHint | null {
  for (const description of descriptions) {
    if (!description) continue;
    const match = description.match(PER_UNIT_RE);
    if (!match) continue;
    const value = Number(match[1]);
    if (!Number.isFinite(value) || value <= 0) continue;
    const packUnit = normalizeUnit(match[2]!);
    if (!packUnit) continue;
    return {
      packLabel: detectLabel(description),
      unitsPerPack: value,
      packUnit,
    };
  }
  return null;
}
