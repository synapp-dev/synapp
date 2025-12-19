export const certificationKeys = {
  all: () => ["certification"] as const,
  stages: {
    all: () => [...certificationKeys.all(), "stages"] as const,
    list: (params?: { limit?: number; offset?: number }) =>
      [...certificationKeys.stages.all(), "list", params] as const,
    detail: (id: string) =>
      [...certificationKeys.stages.all(), "detail", id] as const,
    byCode: (code: string) =>
      [...certificationKeys.stages.all(), "byCode", code] as const,
  },
};
