export const topicsKeys = {
  all: () => ["topics"] as const,
  list: () => [...topicsKeys.all(), "list"] as const,
  listTopics: (params?: {
    stageId?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }) => [...topicsKeys.all(), "listTopics", params] as const,
  detail: (id: string) => [...topicsKeys.all(), "detail", id] as const,
  byStage: (stageId: string) => [...topicsKeys.all(), "byStage", stageId] as const,
};
