export const certificationKeys = {
  all: () => ["certification"] as const,
  courses: {
    all: () => [...certificationKeys.all(), "courses"] as const,
    list: (params?: { limit?: number; offset?: number }) =>
      [...certificationKeys.courses.all(), "list", params] as const,
    detail: (id: string) =>
      [...certificationKeys.courses.all(), "detail", id] as const,
    byCode: (code: string) =>
      [...certificationKeys.courses.all(), "byCode", code] as const,
  },
  // Legacy: stages (deprecated, use courses)
  stages: {
    all: () => [...certificationKeys.all(), "courses"] as const, // Map to courses
    list: (params?: { limit?: number; offset?: number }) =>
      [...certificationKeys.courses.all(), "list", params] as const,
    detail: (id: string) =>
      [...certificationKeys.courses.all(), "detail", id] as const,
    byCode: (code: string) =>
      [...certificationKeys.courses.all(), "byCode", code] as const,
  },
};
