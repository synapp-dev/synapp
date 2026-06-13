export const purchaseOrderKeys = {
  all: ["purchase-orders"] as const,
  list: (
    organisation: string,
    venue: string,
    filters: Record<string, string | undefined>
  ) => [...purchaseOrderKeys.all, "list", organisation, venue, filters] as const,
  detail: (organisation: string, venue: string, poId: string) =>
    [...purchaseOrderKeys.all, "detail", organisation, venue, poId] as const,
  orderGuide: (
    organisation: string,
    venue: string,
    period: string
  ) => [...purchaseOrderKeys.all, "order-guide", organisation, venue, period] as const,
};
