import type { CreateLessonRequest } from "@/types/lesson-create";

export function buildCreateLessonPayload(options: {
  schoolId: string;
  topicId: string;
  classIds: string[];
  status: "preparing" | "ready";
  onBehalfOfUserId?: string | null;
}): CreateLessonRequest {
  return {
    schoolId: options.schoolId,
    topicId: options.topicId,
    classIds: options.classIds,
    status: options.status,
    ...(options.onBehalfOfUserId
      ? { createdByUserId: options.onBehalfOfUserId }
      : {}),
  };
}
