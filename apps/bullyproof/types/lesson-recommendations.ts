/** API response for POST /api/lessons/recommendations */
export type LessonRecommendationsResult = {
  recommendedTopicId: string | null;
  recommendedTopic: {
    id: string;
    title: string;
    stageId: string;
    stageName: string;
    stageOrder: number | null;
  } | null;
  warning: {
    show: boolean;
    classes: Array<{
      classId: string;
      className: string;
      topicTitle: string;
      stageName: string;
    }>;
    multipleStages?: Array<{
      stageId: string;
      stageName: string;
      stageCode: string;
      stageSortIndex: number;
      classes: Array<{
        classId: string;
        className: string;
        yearCodes: string[];
      }>;
      firstTopic: {
        id: string;
        title: string;
        stageOrder: number | null;
      } | null;
    }>;
  } | null;
  reason:
    | "next_topic"
    | "fallback_year_match"
    | "final_fallback"
    | "stage_complete"
    | null;
  completedLessonInfo: {
    lessonTitle?: string;
    topicTitle: string;
    completedAt: string;
  } | null;
  incompatibleClasses?: {
    reason: "different_stages" | "different_progress";
    perClass: Array<{
      classId: string;
      className: string;
      stageName: string;
      nextTopicTitle: string | null;
      completedCount: number;
      topicId: string | null;
      stageId: string | null;
      stageOrder: number | null;
    }>;
  } | null;
  stageComplete?: {
    classId: string;
    className: string;
    stageId: string;
    stageName: string;
    completedCount: number;
  } | null;
  invalidSelection?: { message: string } | null;
  activeLessons: ActiveLessonConflict[];
};

export type ActiveLessonConflict = {
  lessonId: string;
  title: string;
  status: "preparing" | "ready" | "in_progress" | "feedback";
  topicId: string;
  topicTitle: string;
  classIds: string[];
  className: string;
  schoolId: string;
  schoolSlug: string | null;
  createdByUserId: string;
  ownerName: string | null;
  ownerEmail: string | null;
};
