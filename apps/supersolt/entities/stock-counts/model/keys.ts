export const stockCountKeys = {
  all: ["stock-counts"] as const,
  list: (organisation: string, venue: string, status?: string) =>
    [...stockCountKeys.all, "list", organisation, venue, status ?? "all"] as const,
  detail: (organisation: string, venue: string, countId: string) =>
    [...stockCountKeys.all, "detail", organisation, venue, countId] as const,
};
