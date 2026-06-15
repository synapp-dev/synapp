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

export type UpdateSupplierRawItemInput = Partial<CreateSupplierRawItemInput>;
