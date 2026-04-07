export const venuesKeys = {
  all: () => ["venues"] as const,
  access: () => [...venuesKeys.all(), "access"] as const,
  groups: () => [...venuesKeys.access(), "groups"] as const,
};
