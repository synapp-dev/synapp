export type VarianceInput = {
  previousCountQty: number | null;
  receiptsBaseUnits: number;
  consumptionBaseUnits: number;
  countedQty: number;
  costPerUnitCents: number;
  isBaseline: boolean;
  trackVariance: boolean;
};

export type VarianceResult = {
  expectedQty: number | null;
  varianceQty: number | null;
  varianceCents: number | null;
};

export function computeExpectedQty(args: {
  previousCountQty: number | null;
  receiptsBaseUnits: number;
  consumptionBaseUnits: number;
  isBaseline: boolean;
}): number | null {
  if (args.isBaseline || args.previousCountQty === null) {
    return null;
  }
  return (
    args.previousCountQty + args.receiptsBaseUnits - args.consumptionBaseUnits
  );
}

export function computeVariance(input: VarianceInput): VarianceResult {
  if (input.isBaseline || !input.trackVariance) {
    return {
      expectedQty: null,
      varianceQty: null,
      varianceCents: null,
    };
  }

  const expectedQty = computeExpectedQty({
    previousCountQty: input.previousCountQty,
    receiptsBaseUnits: input.receiptsBaseUnits,
    consumptionBaseUnits: input.consumptionBaseUnits,
    isBaseline: false,
  });

  if (expectedQty === null) {
    return {
      expectedQty: null,
      varianceQty: null,
      varianceCents: null,
    };
  }

  const varianceQty = input.countedQty - expectedQty;
  const varianceCents = Math.round(varianceQty * input.costPerUnitCents);

  return { expectedQty, varianceQty, varianceCents };
}

export function sumConsumptionInWindow(
  rows: Array<{ date: string; qtyConsumedBaseUnits: number }>,
  fromDate: string,
  toDate: string,
): number {
  return rows
    .filter((r) => r.date >= fromDate && r.date <= toDate)
    .reduce((sum, r) => sum + r.qtyConsumedBaseUnits, 0);
}

export function isNonTrackedCategory(category: string): boolean {
  return category === "non-tracked";
}
