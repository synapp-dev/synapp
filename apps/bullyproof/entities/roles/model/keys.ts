export const rolesKeys = {
  all: () => ["roles"] as const,
  list: () => [...rolesKeys.all(), "list"] as const,
  listRoles: (params?: {
    scope?: "platform" | "school";
    limit?: number;
    offset?: number;
  }) => [...rolesKeys.all(), "listRoles", params] as const,
  detail: (id: string) => [...rolesKeys.all(), "detail", id] as const,
  byScope: (scope: "platform" | "school") => [...rolesKeys.all(), "byScope", scope] as const,
  userRoles: (userId: string) => [...rolesKeys.all(), "userRoles", userId] as const,
};
