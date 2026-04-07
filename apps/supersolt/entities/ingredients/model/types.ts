export type IngredientCategory =
  | "proteins"
  | "produce"
  | "dairy"
  | "dry-goods"
  | "beverages"
  | "oils-condiments"
  | "other";

export type IngredientStatus = "active" | "inactive";

export type IngredientSummary = {
  id: string;
  name: string;
  category: IngredientCategory;
  unit: string;
  costPerUnitCents: number;
  bestSupplierCostCents: number | null;
  currentStockLevel: number;
  status: IngredientStatus;
  supplierId: string | null;
  updatedAt: string;
};

export type IngredientDetail = IngredientSummary;

export type IngredientListResponse = {
  ingredients: IngredientSummary[];
  total: number;
};

export type UpsertIngredientInput = {
  name: string;
  category: IngredientCategory;
  unit: string;
  costPerUnitCents: number;
  bestSupplierCostCents?: number | null;
  currentStockLevel: number;
  status: IngredientStatus;
  supplierId?: string | null;
};

export type IngredientSelectorOption = {
  id: string;
  name: string;
  unit: string;
  costPerUnitCents: number;
  category: IngredientCategory;
  status: IngredientStatus;
};
