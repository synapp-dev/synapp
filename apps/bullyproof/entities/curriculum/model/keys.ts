export const curriculumKeys = {
  all: () => ["curriculum"] as const,
  stages: {
    all: () => [...curriculumKeys.all(), "stages"] as const,
    list: (params?: { limit?: number; offset?: number }) => 
      [...curriculumKeys.stages.all(), "list", params] as const,
    detail: (id: string) => [...curriculumKeys.stages.all(), "detail", id] as const,
  },
  years: {
    all: () => [...curriculumKeys.all(), "years"] as const,
    list: (params?: { levelId?: string; limit?: number; offset?: number }) => 
      [...curriculumKeys.years.all(), "list", params] as const,
    detail: (id: string) => [...curriculumKeys.years.all(), "detail", id] as const,
    byLevel: (levelId: string) => [...curriculumKeys.years.all(), "byLevel", levelId] as const,
  },
  levels: {
    all: () => [...curriculumKeys.all(), "levels"] as const,
    list: (params?: { limit?: number; offset?: number }) => 
      [...curriculumKeys.levels.all(), "list", params] as const,
  },
};
