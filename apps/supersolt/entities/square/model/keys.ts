export const squareKeys = {
  venueConnection: (organisationSlug: string, venueSlug: string) =>
    ["square", "venue-connection", organisationSlug, venueSlug] as const,
  locations: (organisationSlug: string, venueSlug: string) =>
    ["square", "locations", organisationSlug, venueSlug] as const,
};
