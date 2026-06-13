import type { IngredientCategory } from "@/entities/ingredients/model/types";

export type NormalisationQueueBucket = "main" | "likely_non_inventory";

export type SimilarPendingRawItem = {
  id: string;
  rawDescription: string;
  lastUnitPriceCents: number | null;
};

export type NormalisationQueueItem = {
  id: string;
  supplierId: string;
  supplierName: string;
  rawDescription: string;
  rawUnit: string | null;
  lastQuantity: number | null;
  lastUnitPriceCents: number | null;
  lastLineTotalCents: number | null;
  source: string;
  normalisationStatus: string;
  supplierProductId: string | null;
  lastSeenAt: string;
  bucket: NormalisationQueueBucket;
  similarPendingItems: SimilarPendingRawItem[];
};

export type NormalisationQueueResponse = {
  items: NormalisationQueueItem[];
  counts: {
    pending: number;
    normalised: number;
    skipped: number;
    actioned: number;
    total: number;
  };
};

export type NormalisationSuggestion = {
  confidence: "high" | "medium" | "low";
  likelyNonInventory: boolean;
  nonInventoryReason: string | null;
  productName: string;
  packLabel: string;
  unitsPerPack: number;
  packUnit: "g" | "kg" | "mL" | "L" | "each";
  unitPriceCents: number | null;
  ingredientName: string;
  ingredientCategory: IngredientCategory;
  ingredientUnit: string;
  rationale: string;
};

export type NormaliseCommitSupplierProduct = {
  name: string;
  skuCode?: string | null;
  packLabel: string;
  unitsPerPack: number;
  packUnit: "g" | "kg" | "mL" | "L" | "each";
  unitPriceCents: number;
};

export type NormaliseCommitInput =
  | {
      rawItemId: string;
      mode: "create";
      ingredient: {
        name: string;
        category: IngredientCategory;
        unit: string;
        costPerUnitCents?: number;
        currentStockLevel?: number;
        status?: "active" | "inactive";
        supplierId?: string | null;
      };
      supplierProduct: NormaliseCommitSupplierProduct;
      makeActiveSource?: boolean;
    }
  | {
      rawItemId: string;
      mode: "link";
      ingredientId: string;
      supplierProduct: NormaliseCommitSupplierProduct;
      makeActiveSource?: boolean;
    };

export type NormaliseCommitResult = {
  rawItemId: string;
  ingredientId: string;
  supplierProductId: string;
  normalisationStatus: "normalised";
};
