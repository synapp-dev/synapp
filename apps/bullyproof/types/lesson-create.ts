/** Request body for POST /api/lessons */
export type CreateLessonRequest = {
  schoolId: string;
  topicId: string;
  createdByUserId?: string;
  title?: string;
  description?: string;
  scheduledFor?: string;
  status?:
    | "preparing"
    | "ready"
    | "in_progress"
    | "feedback"
    | "completed"
    | "cancelled";
  classIds?: string[];
};
