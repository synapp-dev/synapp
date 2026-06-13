export type PackUnit = "g" | "kg" | "mL" | "L" | "each";

export function computeCostPerBaseUnitCents(args: {
  unitPriceCents: number;
  unitsPerPack: number;
  packUnit: PackUnit;
}): { costPerBaseUnitCents: number; packUnit: PackUnit } {
  const unitsPerPack = Number(args.unitsPerPack);
  if (!Number.isFinite(unitsPerPack) || unitsPerPack <= 0) {
    throw new Error("unitsPerPack must be greater than zero");
  }

  const unitPriceCents = Math.max(0, Math.round(args.unitPriceCents));
  const costPerBaseUnitCents = Math.round(unitPriceCents / unitsPerPack);

  return {
    costPerBaseUnitCents,
    packUnit: args.packUnit,
  };
}

export function formatCostPerBaseUnit(args: {
  costPerBaseUnitCents: number;
  packUnit: PackUnit;
}): string {
  const dollars = (args.costPerBaseUnitCents / 100).toFixed(2);
  return `$${dollars} per ${args.packUnit}`;
}
