export const suppliersKeys = {
  all: () => ["suppliers"] as const,
  scope: (organisationSlug: string, venueSlug: string) =>
    [...suppliersKeys.all(), organisationSlug, venueSlug] as const,
  list: (
    organisationSlug: string,
    venueSlug: string,
    filters: {
      search?: string;
      category?: string;
      status?: string;
      archived?: boolean;
      hasProducts?: boolean;
      inventorySource?: boolean;
      sort?: string;
      page?: number;
      pageSize?: number;
    }
  ) => [...suppliersKeys.scope(organisationSlug, venueSlug), "list", filters] as const,
  detail: (organisationSlug: string, venueSlug: string, supplierId: string) =>
    [...suppliersKeys.scope(organisationSlug, venueSlug), "detail", supplierId] as const,
};
