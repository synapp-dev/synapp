export type MixedUnitLine = {
  unitKey: string;
  quantity: number;
  multiplierToBase: number;
};

export type MixedUnitBreakdown = {
  lines: MixedUnitLine[];
  totalBaseUnits: number;
};

export function convertMixedUnitsToBase(
  lines: Array<{ unitKey: string; quantity: number; multiplierToBase: number }>,
): MixedUnitBreakdown {
  if (lines.some((l) => l.quantity < 0)) {
    throw new Error("Negative quantity not allowed");
  }

  let totalBaseUnits = 0;
  for (const line of lines) {
    totalBaseUnits += line.quantity * line.multiplierToBase;
  }

  return {
    lines: lines.map((l) => ({ ...l })),
    totalBaseUnits,
  };
}

export function buildPackUnitLines(args: {
  cartons?: number;
  unitsPerCarton: number;
  looseUnits?: number;
  partialBaseUnits?: number;
}): MixedUnitBreakdown {
  const lines: MixedUnitLine[] = [];

  if (args.cartons && args.cartons > 0) {
    lines.push({
      unitKey: "carton",
      quantity: args.cartons,
      multiplierToBase: args.unitsPerCarton,
    });
  }
  if (args.looseUnits && args.looseUnits > 0) {
    lines.push({
      unitKey: "unit",
      quantity: args.looseUnits,
      multiplierToBase: 1,
    });
  }
  if (args.partialBaseUnits && args.partialBaseUnits > 0) {
    lines.push({
      unitKey: "partial",
      quantity: args.partialBaseUnits,
      multiplierToBase: 1,
    });
  }

  return convertMixedUnitsToBase(lines);
}
