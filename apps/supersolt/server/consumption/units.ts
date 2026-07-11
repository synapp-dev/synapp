export type UnitFamily = "mass" | "volume" | "count";

type UnitDef = { family: UnitFamily; toCanonical: number };

const UNIT_DEFS: Record<string, UnitDef> = {
  // mass (canonical: gram)
  mg: { family: "mass", toCanonical: 0.001 },
  g: { family: "mass", toCanonical: 1 },
  gm: { family: "mass", toCanonical: 1 },
  gram: { family: "mass", toCanonical: 1 },
  grams: { family: "mass", toCanonical: 1 },
  kg: { family: "mass", toCanonical: 1000 },
  kgs: { family: "mass", toCanonical: 1000 },
  kilo: { family: "mass", toCanonical: 1000 },
  kilos: { family: "mass", toCanonical: 1000 },
  kilogram: { family: "mass", toCanonical: 1000 },
  kilograms: { family: "mass", toCanonical: 1000 },
  // volume (canonical: millilitre)
  ml: { family: "volume", toCanonical: 1 },
  mls: { family: "volume", toCanonical: 1 },
  millilitre: { family: "volume", toCanonical: 1 },
  millilitres: { family: "volume", toCanonical: 1 },
  milliliter: { family: "volume", toCanonical: 1 },
  milliliters: { family: "volume", toCanonical: 1 },
  cl: { family: "volume", toCanonical: 10 },
  l: { family: "volume", toCanonical: 1000 },
  lt: { family: "volume", toCanonical: 1000 },
  ltr: { family: "volume", toCanonical: 1000 },
  litre: { family: "volume", toCanonical: 1000 },
  litres: { family: "volume", toCanonical: 1000 },
  liter: { family: "volume", toCanonical: 1000 },
  liters: { family: "volume", toCanonical: 1000 },
  // count (canonical: each)
  each: { family: "count", toCanonical: 1 },
  ea: { family: "count", toCanonical: 1 },
  unit: { family: "count", toCanonical: 1 },
  units: { family: "count", toCanonical: 1 },
  pc: { family: "count", toCanonical: 1 },
  pcs: { family: "count", toCanonical: 1 },
  piece: { family: "count", toCanonical: 1 },
  pieces: { family: "count", toCanonical: 1 },
  serve: { family: "count", toCanonical: 1 },
  serves: { family: "count", toCanonical: 1 },
  serving: { family: "count", toCanonical: 1 },
  servings: { family: "count", toCanonical: 1 },
  portion: { family: "count", toCanonical: 1 },
  portions: { family: "count", toCanonical: 1 },
  item: { family: "count", toCanonical: 1 },
  items: { family: "count", toCanonical: 1 },
  x: { family: "count", toCanonical: 1 },
  dozen: { family: "count", toCanonical: 12 },
};

export function normalizeUnit(raw: string): string {
  return raw.trim().toLowerCase().replace(/\.+$/, "").replace(/\s+/g, " ");
}

const EACH: UnitDef = { family: "count", toCanonical: 1 };

export function resolveUnit(raw: string): UnitDef | null {
  const key = normalizeUnit(raw);
  if (key === "") return EACH;
  return UNIT_DEFS[key] ?? null;
}

export function isCountUnit(raw: string): boolean {
  const def = resolveUnit(raw);
  return def !== null && def.family === "count";
}

/**
 * Convert a quantity between units. Returns null when either unit is
 * unknown or the units belong to different families (e.g. g -> ml) —
 * callers surface that as a unit_conversion_failure exception rather
 * than guessing. Identical normalized units always convert, even when
 * both are unknown free text ("bunch" -> "bunch").
 */
export function convertQty(
  qty: number,
  fromUnit: string,
  toUnit: string,
): number | null {
  if (!Number.isFinite(qty)) return null;
  if (normalizeUnit(fromUnit) === normalizeUnit(toUnit)) return qty;

  const from = resolveUnit(fromUnit);
  const to = resolveUnit(toUnit);
  if (!from || !to) return null;
  if (from.family !== to.family) return null;

  return (qty * from.toCanonical) / to.toCanonical;
}
