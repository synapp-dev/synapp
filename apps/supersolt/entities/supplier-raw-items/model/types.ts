export type SupplierRawItemSummary = {
  id: string;
  supplierId: string;
  rawDescription: string;
  rawUnit: string | null;
  lastQuantity: number | null;
  lastUnitPriceCents: number | null;
  lastLineTotalCents: number | null;
  source: string;
  normalisationStatus: string;
  firstSeenAt: string;
  lastSeenAt: string;
  updatedAt: string;
};

export type SupplierRawItemListResponse = {
  items: SupplierRawItemSummary[];
};

export type CreateSupplierRawItemInput = {
  rawDescription: string;
  rawUnit?: string | null;
  lastQuantity?: number | null;
  lastUnitPriceCents?: number | null;
  lastLineTotalCents?: number | null;
};

export type UpdateSupplierRawItemInput = Partial<CreateSupplierRawItemInput>;
