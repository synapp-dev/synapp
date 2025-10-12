export const schoolSectorsKeys = {
  all: () => ["school-sectors"] as const,
  list: () => [...schoolSectorsKeys.all(), "list"] as const,
  listSchoolSectors: (params?: { limit?: number; offset?: number }) => 
    [...schoolSectorsKeys.all(), "listSchoolSectors", params] as const,
  detail: (id: string) => [...schoolSectorsKeys.all(), "detail", id] as const,
};
