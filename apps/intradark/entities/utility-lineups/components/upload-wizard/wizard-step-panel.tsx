"use client";

import {
  STEP_INDEX_CHOOSE_MAP,
  STEP_INDEX_ENEMY_POV,
  STEP_INDEX_LAND,
  STEP_INDEX_NADE_DETAILS,
  STEP_INDEX_REVIEW,
  STEP_INDEX_THROW,
  STEP_INDEX_UPLOAD_VIDEO,
} from "./constants";
import { ChooseMapStep } from "./steps/choose-map-step";
import { EnemyPovStep } from "./steps/enemy-pov-step";
import { LandStep } from "./steps/land-step";
import { NadeDetailsStep } from "./steps/nade-details-step";
import { ReviewStep } from "./steps/review-step";
import { ThrowStep } from "./steps/throw-step";
import { UploadVideoStep } from "./steps/upload-video-step";
import { useUploadWizard } from "./upload-wizard-context";

export function UploadWizardStepPanel() {
  const { stepIndex, error, stepErr } = useUploadWizard();

  return (
    <>
      {error ? (
        <p className="text-destructive mb-3 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {stepIndex === STEP_INDEX_CHOOSE_MAP ? <ChooseMapStep /> : null}
      {stepIndex === STEP_INDEX_UPLOAD_VIDEO ? <UploadVideoStep /> : null}
      {stepIndex === STEP_INDEX_NADE_DETAILS ? <NadeDetailsStep /> : null}
      {stepIndex === STEP_INDEX_THROW ? <ThrowStep /> : null}
      {stepIndex === STEP_INDEX_LAND ? <LandStep /> : null}
      {stepIndex === STEP_INDEX_ENEMY_POV ? <EnemyPovStep /> : null}
      {stepIndex === STEP_INDEX_REVIEW ? <ReviewStep /> : null}

      {stepErr && stepIndex !== STEP_INDEX_NADE_DETAILS ? (
        <p className="text-muted-foreground mt-3 text-xs">{stepErr}</p>
      ) : null}
      {stepErr && stepIndex === STEP_INDEX_NADE_DETAILS ? (
        <p className="sr-only" role="status">
          {stepErr}
        </p>
      ) : null}
    </>
  );
}
