export const lessonsKeys = {
  all: () => ["lessons"] as const,
  list: () => [...lessonsKeys.all(), "list"] as const,
  listLessons: (params?: {
    teacherId?: string;
    classId?: string;
    topicId?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }) => [...lessonsKeys.all(), "listLessons", params] as const,
  detail: (id: string) => [...lessonsKeys.all(), "detail", id] as const,
  byTeacher: (teacherId: string) => [...lessonsKeys.all(), "byTeacher", teacherId] as const,
  byClass: (classId: string) => [...lessonsKeys.all(), "byClass", classId] as const,
};
