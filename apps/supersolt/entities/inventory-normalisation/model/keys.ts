export const inventoryNormalisationKeys = {
  all: ["inventory-normalisation"] as const,
  queue: (organisationSlug: string, venueSlug: string, search?: string) =>
    [
      ...inventoryNormalisationKeys.all,
      "queue",
      organisationSlug,
      venueSlug,
      search ?? "",
    ] as const,
};
