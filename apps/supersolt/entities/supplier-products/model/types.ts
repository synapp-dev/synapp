export type SupplierProductSummary = {
  id: string;
  supplierId: string;
  name: string;
  skuCode: string | null;
  packLabel: string;
  unitsPerPack: number;
  packUnit: string;
  unitPriceCents: number;
  ingredientId: string | null;
  ingredientName: string | null;
  isActiveForIngredient: boolean;
  updatedAt: string;
};

export type SupplierProductDetail = SupplierProductSummary & {
  priceHistory: Array<{
    id: string;
    oldPriceCents: number | null;
    newPriceCents: number;
    source: string;
    sourceRef: string | null;
    changedAt: string;
  }>;
};

export type UpsertSupplierProductInput = {
  name: string;
  skuCode?: string | null;
  packLabel?: string;
  unitsPerPack?: number;
  packUnit?: string;
  unitPriceCents: number;
  ingredientId?: string | null;
  makeActive?: boolean;
  propagateCost?: boolean;
};

export type SupplierProductListResponse = {
  products: SupplierProductSummary[];
};
