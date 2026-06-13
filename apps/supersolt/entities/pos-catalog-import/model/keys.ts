export const posCatalogImportKeys = {
  all: ["pos-catalog-import"] as const,
  list: (organisationSlug: string, venueSlug: string) =>
    [...posCatalogImportKeys.all, organisationSlug, venueSlug, "list"] as const,
};
