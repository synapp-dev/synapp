export const wasteKeys = {
  all: ["waste"] as const,
  list: (organisation: string, venue: string, fromIso?: string, toIso?: string) =>
    ["waste", "list", organisation, venue, fromIso ?? "", toIso ?? ""] as const,
};
