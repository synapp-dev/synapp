export const classesKeys = {
  all: () => ["classes"] as const,
  list: () => [...classesKeys.all(), "list"] as const,
  listClasses: (params?: {
    schoolId?: string;
    limit?: number;
    offset?: number;
    search?: string;
    active?: boolean;
  }) => [...classesKeys.all(), "listClasses", params] as const,
  detail: (id: string) => [...classesKeys.all(), "detail", id] as const,
  bySchool: (schoolId: string) => [...classesKeys.all(), "bySchool", schoolId] as const,
};
