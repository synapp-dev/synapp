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
  /** Per-piece size (e.g. a 160 g fillet sold by the kg). Informational. */
  portionSize?: number | null;
  portionUnit?: "g" | "kg" | "mL" | "L" | "each" | null;
  portionLabel?: string | null;
};

/**
 * An extra pack representation of the same ingredient, priced differently on
 * invoices (e.g. "bag" alongside the base "each"). Each becomes its own
 * supplier_product linked to its own raw item; the primary supplierProduct stays
 * the active costing source.
 */
export type NormaliseCommitAdditionalPack = {
  rawItemId: string;
  supplierProduct: NormaliseCommitSupplierProduct;
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
      /** Same-product quantity variants to fold into this product in one commit. */
      alsoRawItemIds?: string[];
      /** Same product priced under other packs — kept as their own products. */
      additionalPacks?: NormaliseCommitAdditionalPack[];
    }
  | {
      rawItemId: string;
      mode: "link";
      ingredientId: string;
      supplierProduct: NormaliseCommitSupplierProduct;
      makeActiveSource?: boolean;
      alsoRawItemIds?: string[];
      additionalPacks?: NormaliseCommitAdditionalPack[];
    };

export type NormaliseCommitResult = {
  rawItemId: string;
  ingredientId: string;
  supplierProductId: string;
  normalisationStatus: "normalised";
  cascadedCount: number;
};
