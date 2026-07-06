import type { WizardState } from "@/types/lesson-wizard";
import type { LessonRecommendationsResult } from "@/types/lesson-recommendations";
import { canProceedFromRecommendationStep } from "./recommendation-guards";

export const WIZARD_TOTAL_STEPS = 5;

export function initialWizardState(): WizardState {
  return {
    step: 0,
    selectedClasses: [],
    selectedTopic: null,
  };
}

export function clampWizardStep(step: number): number {
  return Math.max(0, Math.min(WIZARD_TOTAL_STEPS - 1, step));
}

export function canProceedFromWizardStep(options: {
  step: number;
  state: WizardState;
  recommendation: LessonRecommendationsResult | null | undefined;
  selectedStageId: string | null;
  isAdminRestricted: boolean;
  onBehalfOfUserId: string | null;
}): boolean {
  const {
    step,
    state,
    recommendation,
    selectedStageId,
    isAdminRestricted,
    onBehalfOfUserId,
  } = options;

  switch (step) {
    case 0:
      return true;
    case 1:
      return state.selectedClasses.length > 0;
    case 2:
      return canProceedFromRecommendationStep({
        selectedClassIds: state.selectedClasses.map((c) => c.id),
        recommendation,
        selectedStageId,
      });
    case 3:
      return (
        state.selectedClasses.length > 0 && state.selectedTopic !== null
      );
    case 4:
      if (state.selectedClasses.length === 0) {
        return false;
      }
      if (isAdminRestricted) {
        return onBehalfOfUserId !== null;
      }
      return true;
    default:
      return false;
  }
}
