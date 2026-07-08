export type SupplierRawItemSummary = {
  id: string;
  supplierId: string;
  rawDescription: string;
  rawUnit: string | null;
  lastQuantity: number | null;
  lastUnitPriceCents: number | null;
  lastLineTotalCents: number | null;
  isLikelyInventory: boolean | null;
  source: string;
  normalisationStatus: string;
  /** Set when a user has approved the extracted values as correct. */
  reviewedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  updatedAt: string;
};

export type SupplierRawItemListResponse = {
  items: SupplierRawItemSummary[];
};

/** One invoice a raw item appeared on, for the Items "Invoice (N)" source dialog. */
export type SupplierRawItemSource = {
  invoiceId: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  parsed: boolean;
};

export type SupplierRawItemSourcesResponse = {
  /** Keyed by raw item id → the distinct invoices it was seen on. */
  sources: Record<string, SupplierRawItemSource[]>;
};

export type CreateSupplierRawItemInput = {
  rawDescription: string;
  rawUnit?: string | null;
  lastQuantity?: number | null;
  lastUnitPriceCents?: number | null;
  lastLineTotalCents?: number | null;
};

export type UpdateSupplierRawItemInput = Partial<CreateSupplierRawItemInput> & {
  /** Approve (true) or clear approval (false) — stamps reviewedAt. */
  reviewed?: boolean;
};

export type ApproveSupplierRawItemsInput = {
  rawItemIds: string[];
  reviewed?: boolean;
};

/** An inferred pack size for a review product. */
export type SupplierReviewPack = {
  key: string;
  label: string;
  unitsPerPack: number;
  packUnit: string;
  magnitude: number | null;
  uom: string | null;
  packCount: number | null;
  rawItemIds: string[];
  currentPriceCents: number | null;
};

/** A single observed price for a review product, newest first. */
export type SupplierReviewPricePoint = {
  invoiceId: string;
  date: string | null;
  unitPriceCents: number;
};

/** Raw items clustered into a pack-aware product for the approval wizard. */
export type SupplierReviewProduct = {
  key: string;
  canonicalName: string;
  aliases: string[];
  rawItemIds: string[];
  memberNormalizedDescriptions: string[];
  isLikelyInventory: boolean;
  reviewed: boolean;
  currentPriceCents: number | null;
  packs: SupplierReviewPack[];
  priceHistory: SupplierReviewPricePoint[];
};

export type SupplierReviewProductsResponse = {
  products: SupplierReviewProduct[];
};

/** Approve clustered products into the catalog (one supplier_product per pack). */
export type ApproveSupplierAsProductsInput = {
  products: Array<{ rawItemIds: string[]; name: string }>;
};

export type ApproveSupplierAsProductsResult = {
  createdProducts: number;
  updatedProducts: number;
  reviewedItems: number;
};

/** Mark a product's raw items as "not inventory" + reviewed (wizard Skip). */
export type SkipSupplierItemsInput = {
  rawItemIds: string[];
};

/**
 * One-shot close of the items-triage step: rescue wrongly-flagged rows back to
 * inventory, stamp everything else reviewed as-is. Mints no products — mapping
 * happens at normalisation.
 */
export type ConfirmSupplierItemsTriageInput = {
  rescueRawItemIds?: string[];
};

export type ConfirmSupplierItemsTriageResult = {
  rescued: number;
  confirmed: number;
};
