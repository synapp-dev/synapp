export const meKeys = {
  all: () => ["me"] as const,
  current: () => [...meKeys.all(), "current"] as const,
  detail: (id: string) => [...meKeys.all(), "detail", id] as const,
  byEmail: (email: string) => [...meKeys.all(), "byEmail", email] as const,
  schools: {
    all: () => [...meKeys.all(), "schools"] as const,
    mySchools: (params?: { limit?: number; random?: boolean }) =>
      [...meKeys.schools.all(), "mySchools", params] as const,
    forUser: (userId: string, params?: { limit?: number }) =>
      [...meKeys.schools.all(), "forUser", userId, params] as const,
  },
};
