export const schoolLevelsKeys = {
  all: () => ["school-levels"] as const,
  list: () => [...schoolLevelsKeys.all(), "list"] as const,
  listSchoolLevels: (params?: { limit?: number; offset?: number }) => 
    [...schoolLevelsKeys.all(), "listSchoolLevels", params] as const,
  detail: (id: string) => [...schoolLevelsKeys.all(), "detail", id] as const,
};
