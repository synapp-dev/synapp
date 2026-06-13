export type OrderGuideSuggestionBreakdown = {
  forecastedDemandBaseUnits: number;
  currentStockBaseUnits: number;
  pendingDeliveriesBaseUnits: number;
  bufferPercent: number;
  bufferAddedBaseUnits: number;
  needBaseUnits: number;
  packLabel: string;
  unitsPerPack: number;
  packUnit: string;
  suggestedPackQuantity: number;
  assumptions: string[];
};

export type OrderGuideSuggestionInput = {
  ingredientId: string;
  ingredientName: string;
  supplierId: string;
  supplierName: string;
  supplierProductId: string;
  supplierProductName: string;
  unitPriceCents: number;
  unitsPerPack: number;
  packLabel: string;
  packUnit: string;
  baseUnit: string;
  forecastedDemandBaseUnits: number;
  currentStockBaseUnits: number;
  pendingDeliveriesBaseUnits: number;
  bufferPercent: number;
  minimumOrderCents: number;
  supplierSubtotalCents: number;
};

export type OrderGuideSuggestion = OrderGuideSuggestionInput & {
  suggestedPackQuantity: number;
  suggestedSubtotalCents: number;
  breakdown: OrderGuideSuggestionBreakdown;
  belowMinimum: boolean;
  minimumShortfallCents: number;
};

export function roundUpToPack(needBaseUnits: number, unitsPerPack: number): number {
  if (unitsPerPack <= 0) return 0;
  if (needBaseUnits <= 0) return 0;
  return Math.ceil(needBaseUnits / unitsPerPack);
}

export function computeSuggestion(
  input: OrderGuideSuggestionInput
): OrderGuideSuggestion | null {
  const assumptions: string[] = [];
  const unitsPerPack = input.unitsPerPack > 0 ? input.unitsPerPack : 1;

  let demand = input.forecastedDemandBaseUnits;
  if (demand <= 0) {
    return null;
  }

  const stock = Math.max(0, input.currentStockBaseUnits);
  const pending = Math.max(0, input.pendingDeliveriesBaseUnits);
  if (stock === 0 && input.currentStockBaseUnits === 0) {
    assumptions.push("Stock-on-hand unknown or zero — verify with a stock count");
  }

  const netBeforeBuffer = demand - stock - pending;
  const bufferAdded = netBeforeBuffer > 0 ? netBeforeBuffer * (input.bufferPercent / 100) : 0;
  const need = Math.max(0, netBeforeBuffer + bufferAdded);
  const suggestedPackQuantity = roundUpToPack(need, unitsPerPack);

  if (suggestedPackQuantity <= 0) {
    return null;
  }

  const suggestedSubtotalCents = suggestedPackQuantity * input.unitPriceCents;
  const supplierSubtotalAfter = input.supplierSubtotalCents + suggestedSubtotalCents;
  const belowMinimum =
    input.minimumOrderCents > 0 && supplierSubtotalAfter < input.minimumOrderCents;
  const minimumShortfallCents = belowMinimum
    ? input.minimumOrderCents - supplierSubtotalAfter
    : 0;

  return {
    ...input,
    suggestedPackQuantity,
    suggestedSubtotalCents,
    belowMinimum,
    minimumShortfallCents,
    breakdown: {
      forecastedDemandBaseUnits: demand,
      currentStockBaseUnits: stock,
      pendingDeliveriesBaseUnits: pending,
      bufferPercent: input.bufferPercent,
      bufferAddedBaseUnits: bufferAdded,
      needBaseUnits: need,
      packLabel: input.packLabel,
      unitsPerPack,
      packUnit: input.packUnit,
      suggestedPackQuantity,
      assumptions,
    },
  };
}

export function sumForecastRevenueCents(
  forecasts: Array<{ date: string; metric: string; forecastValue: number }>,
  fromDate: string,
  toDate: string
): number {
  let total = 0;
  for (const row of forecasts) {
    if (row.metric !== "revenue") continue;
    if (row.date < fromDate || row.date > toDate) continue;
    total += row.forecastValue;
  }
  return Math.round(total);
}
