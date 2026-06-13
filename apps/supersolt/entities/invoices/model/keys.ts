export const invoiceKeys = {
  all: ["invoices"] as const,
  list: (org: string, venue: string, view?: string) =>
    [...invoiceKeys.all, org, venue, "list", view ?? "all"] as const,
  detail: (org: string, venue: string, id: string) =>
    [...invoiceKeys.all, org, venue, "detail", id] as const,
};
