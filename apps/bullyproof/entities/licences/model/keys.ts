export const licencesKeys = {
  all: () => ["licences"] as const,
  list: () => [...licencesKeys.all(), "list"] as const,
  listLicences: (params?: {
    schoolId?: string;
    status?: "DRAFT" | "PENDING" | "ACTIVE" | "SUSPENDED" | "EXPIRED" | "CANCELLED";
    limit?: number;
    offset?: number;
  }) => [...licencesKeys.all(), "listLicences", params] as const,
  detail: (id: string) => [...licencesKeys.all(), "detail", id] as const,
  bySchool: (schoolId: string) => [...licencesKeys.all(), "bySchool", schoolId] as const,
};
