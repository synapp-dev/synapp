export const salesInsightsKeys = {
  all: () => ["sales-insights"] as const,
  scoped: (organisationSlug: string, venueSlug: string) =>
    [...salesInsightsKeys.all(), "scope", organisationSlug, venueSlug] as const,
  orders: (
    organisationSlug: string,
    venueSlug: string,
    startIso: string,
    endIso: string
  ) =>
    [
      ...salesInsightsKeys.scoped(organisationSlug, venueSlug),
      "orders",
      startIso,
      endIso,
    ] as const,
  intelligence: (
    organisationSlug: string,
    venueSlug: string,
    startIso: string,
    endIso: string,
    scope: string
  ) =>
    [
      ...salesInsightsKeys.scoped(organisationSlug, venueSlug),
      "intelligence",
      scope,
      startIso,
      endIso,
    ] as const,
  squareInvoices: (
    organisationSlug: string,
    venueSlug: string,
    startIso: string,
    endIso: string
  ) =>
    [
      ...salesInsightsKeys.scoped(organisationSlug, venueSlug),
      "square-invoices",
      startIso,
      endIso,
    ] as const,
};
