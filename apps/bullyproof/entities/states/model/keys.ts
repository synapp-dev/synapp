export const statesKeys = {
  all: () => ["states"] as const,
  list: () => [...statesKeys.all(), "list"] as const,
  listStates: (params?: { limit?: number; offset?: number }) => 
    [...statesKeys.all(), "listStates", params] as const,
  detail: (id: string) => [...statesKeys.all(), "detail", id] as const,
};
