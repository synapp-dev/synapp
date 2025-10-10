export const schoolKeys = {
  all: () => ["schools"] as const,
  list: () => [...schoolKeys.all(), "list"] as const,
  listSchools: (params?: {
    limit?: number;
    offset?: number;
    search?: string;
  }) => [...schoolKeys.all(), "listSchools", params] as const,
  searchSchools: (params: { query: string; limit?: number }) =>
    [...schoolKeys.all(), "search", params] as const,
  detail: (id: string) => [...schoolKeys.all(), "detail", id] as const,
};
