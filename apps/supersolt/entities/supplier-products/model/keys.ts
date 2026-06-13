export const supplierProductKeys = {
  all: ["supplier-products"] as const,
  scope: (org: string, venue: string) =>
    [...supplierProductKeys.all, org, venue] as const,
  bySupplier: (org: string, venue: string, supplierId: string) =>
    [...supplierProductKeys.scope(org, venue), "supplier", supplierId] as const,
  detail: (org: string, venue: string, supplierId: string, productId: string) =>
    [
      ...supplierProductKeys.bySupplier(org, venue, supplierId),
      "detail",
      productId,
    ] as const,
};
