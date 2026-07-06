import type { ActiveLessonConflict, LessonRecommendationsResult } from "@/types/lesson-recommendations";

export function getConflictingActiveLessons(
  activeLessons: ActiveLessonConflict[],
  selectedClassIds: string[]
): ActiveLessonConflict[] {
  return activeLessons.filter((lesson) =>
    lesson.classIds.some((classId) => selectedClassIds.includes(classId))
  );
}

export function canProceedFromRecommendationStep(options: {
  selectedClassIds: string[];
  recommendation: LessonRecommendationsResult | null | undefined;
  selectedStageId: string | null;
}): boolean {
  const { selectedClassIds, recommendation, selectedStageId } = options;

  if (selectedClassIds.length === 0) {
    return false;
  }

  const hasMultipleStages =
    !!recommendation?.warning?.multipleStages &&
    recommendation.warning.multipleStages.length > 1;

  const conflictingLessons = getConflictingActiveLessons(
    recommendation?.activeLessons ?? [],
    selectedClassIds
  );

  return (
    conflictingLessons.length === 0 &&
    !recommendation?.incompatibleClasses &&
    !recommendation?.stageComplete &&
    !recommendation?.invalidSelection &&
    (recommendation?.recommendedTopicId !== null ||
      (hasMultipleStages && selectedStageId !== null))
  );
}
