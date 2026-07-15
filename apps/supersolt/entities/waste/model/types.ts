export type WasteEntryDto = {
  id: string;
  ingredientId: string | null;
  recipeId: string | null;
  itemName: string;
  isBatch: boolean;
  qty: number;
  unit: string;
  qtyBaseUnits: number | null;
  costCents: number;
  reason: string;
  note: string | null;
  source: string;
  occurredAt: string;
  createdAt: string;
  loggedBy: string | null;
};

export type WasteListResponse = {
  entries: WasteEntryDto[];
};

export type CreateWasteEntryInput = {
  ingredientId?: string | null;
  recipeId?: string | null;
  qty: number;
  unit: string;
  reason: string;
  note?: string | null;
  occurredAt?: string | null;
};
