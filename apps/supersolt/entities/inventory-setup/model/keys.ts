export const inventorySetupKeys = {
  all: ["inventory-setup"] as const,
  progress: (organisationSlug: string, venueSlug: string) =>
    [...inventorySetupKeys.all, "progress", organisationSlug, venueSlug] as const,
};
