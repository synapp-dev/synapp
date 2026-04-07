export const recipesKeys = {
  all: () => ["recipes"] as const,
  scope: (organisationSlug: string, venueSlug: string) =>
    [...recipesKeys.all(), organisationSlug, venueSlug] as const,
  list: (
    organisationSlug: string,
    venueSlug: string,
    filters: {
      search?: string;
      category?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    }
  ) => [...recipesKeys.scope(organisationSlug, venueSlug), "list", filters] as const,
  detail: (organisationSlug: string, venueSlug: string, recipeId: string) =>
    [...recipesKeys.scope(organisationSlug, venueSlug), "detail", recipeId] as const,
};
