export const xeroKeys = {
  venueConnection: (organisationSlug: string, venueSlug: string) =>
    ["xero", "venue-connection", organisationSlug, venueSlug] as const,
  invoices: (
    organisationSlug: string,
    venueSlug: string,
    fromDate?: string,
    toDate?: string,
  ) => ["xero", "invoices", organisationSlug, venueSlug, fromDate ?? "", toDate ?? ""] as const,
  invoiceDetail: (organisationSlug: string, venueSlug: string, invoiceId: string) =>
    ["xero", "invoice-detail", organisationSlug, venueSlug, invoiceId] as const,
};
