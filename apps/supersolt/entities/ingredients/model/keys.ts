export const ingredientsKeys = {
  all: () => ["ingredients"] as const,
  scope: (organisationSlug: string, venueSlug: string) =>
    [...ingredientsKeys.all(), organisationSlug, venueSlug] as const,
  list: (
    organisationSlug: string,
    venueSlug: string,
    filters: {
      search?: string;
      category?: string;
      status?: string;
      supplierId?: string;
      page?: number;
      pageSize?: number;
    }
  ) => [...ingredientsKeys.scope(organisationSlug, venueSlug), "list", filters] as const,
  selector: (organisationSlug: string, venueSlug: string) =>
    [...ingredientsKeys.scope(organisationSlug, venueSlug), "selector"] as const,
  detail: (organisationSlug: string, venueSlug: string, ingredientId: string) =>
    [...ingredientsKeys.scope(organisationSlug, venueSlug), "detail", ingredientId] as const,
};
