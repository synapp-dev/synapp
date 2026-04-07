export const menuItemsKeys = {
  all: () => ["menu-items"] as const,
  scope: (organisationSlug: string, venueSlug: string) =>
    [...menuItemsKeys.all(), organisationSlug, venueSlug] as const,
  list: (
    organisationSlug: string,
    venueSlug: string,
    filters: {
      search?: string;
      sectionName?: string;
      page?: number;
      pageSize?: number;
    }
  ) => [...menuItemsKeys.scope(organisationSlug, venueSlug), "list", filters] as const,
  detail: (organisationSlug: string, venueSlug: string, menuItemId: string) =>
    [...menuItemsKeys.scope(organisationSlug, venueSlug), "detail", menuItemId] as const,
};
