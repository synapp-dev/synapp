export type { ClassOption, TopicOption, WizardState } from "@/types/lesson-wizard";
export type { CreateLessonRequest } from "@/types/lesson-create";
export type { LessonRecommendationsResult } from "@/types/lesson-recommendations";

export {
  WIZARD_TOTAL_STEPS,
  clampWizardStep,
  initialWizardState,
  canProceedFromWizardStep,
} from "./wizard-navigation";
export {
  getConflictingActiveLessons,
  canProceedFromRecommendationStep,
} from "./recommendation-guards";
export { buildCreateLessonPayload } from "./build-create-payload";
