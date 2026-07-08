import type { ReviewPack } from "@/server/supplier-raw-items/review-clustering";

/** The catalog's allowed base pack units (mirrors supplier-products). */
export type PackUnit = "g" | "kg" | "mL" | "L" | "each";

/** Map the parser's unit-of-measure onto a catalog base pack unit. */
export function toPackUnit(uom: string | null): PackUnit {
  switch (uom) {
    case "kg":
      return "kg";
    case "g":
      return "g";
    case "lt":
      return "L";
    case "ml":
      return "mL";
    default:
      return "each";
  }
}

export type CatalogPackFields = {
  packUnit: PackUnit;
  /** Total base units in the pack, so cost-per-base = price / unitsPerPack. */
  unitsPerPack: number;
  /** Size of one unit, when the pack is measured (else null → counted "each"). */
  portionSize: number | null;
  portionUnit: PackUnit | null;
};

/**
 * Translate an inferred pack into supplier_product fields. `unitsPerPack` is the
 * total base measure (magnitude × pack count) so a "1.9kg (6)" case becomes
 * 11.4 kg and a "1lt x 8" carton becomes 8 L — keeping cost-per-base-unit right.
 */
export function packToCatalogFields(
  pack: Pick<ReviewPack, "uom" | "magnitude" | "packCount">,
): CatalogPackFields {
  const packUnit = toPackUnit(pack.uom);
  const unitsPerPack = Math.max(0.001, (pack.magnitude ?? 1) * (pack.packCount ?? 1));
  const hasMeasure = packUnit !== "each" && pack.magnitude != null;
  return {
    packUnit,
    unitsPerPack,
    portionSize: hasMeasure ? pack.magnitude : null,
    portionUnit: hasMeasure ? packUnit : null,
  };
}
