export const supplierRawItemsKeys = {
  all: ["supplier-raw-items"] as const,
  list: (organisationSlug: string, venueSlug: string, supplierId: string, search?: string) =>
    [...supplierRawItemsKeys.all, "list", organisationSlug, venueSlug, supplierId, search ?? ""] as const,
};
