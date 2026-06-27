"use client";

import * as React from "react";
import { track } from "@vercel/analytics/react";

import { groupMapsByUtilityPool } from "@/entities/utility-lineups/lib/utility-map-pool-groups";
import { radarNormMappingForMap } from "@/entities/utility-lineups/lib/radar-display-mapping";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

import {
  GRENADE_TYPE_OPTIONS,
  LAND_STILL_SLOTS,
  STEP_INDEX_NADE_DETAILS,
  STEP_INDEX_REVIEW,
  THROW_STILL_SLOTS,
} from "./constants";
import {
  buildTechnique,
  canNavigateToUploadWizardStep,
  validateUploadWizardStep,
} from "./helpers";
import { runUploadWizardEnqueue } from "./state/upload-wizard-enqueue";
import { useUploadWizardRadarState } from "./state/use-upload-wizard-radar-state";
import { useUploadWizardStillsState } from "./state/use-upload-wizard-stills-state";
import { useUploadWizardVideoState } from "./state/use-upload-wizard-video-state";
import type {
  GrenadeType,
  MarginType,
  MovementType,
  NadeDetailActiveRow,
  SideType,
  TechniqueClickChoice,
  TechniqueJumpSelection,
  TechniqueType,
} from "./types";
import type {
  UploadWizardContextValue,
  UploadWizardProviderProps,
} from "./upload-wizard-types";

export type UseUploadWizardStateInput = Omit<
  UploadWizardProviderProps,
  "children"
>;

export function useUploadWizardState({
  open,
  onOpenChange,
  maps,
  initialMapSlug,
  initialDisplayName,
  initialRadarImageUrl,
}: UseUploadWizardStateInput): UploadWizardContextValue {
  const [stepIndex, setStepIndex] = React.useState(0);
  const [selectedMapSlug, setSelectedMapSlug] = React.useState<string | null>(
    null,
  );
  const selectedMap = React.useMemo(
    () =>
      selectedMapSlug
        ? maps.find((m) => m.slug === selectedMapSlug)
        : undefined,
    [maps, selectedMapSlug],
  );

  const mapPickerSections = React.useMemo(
    () => groupMapsByUtilityPool(maps),
    [maps],
  );

  const mapPickerSectionsWithStagger = React.useMemo(() => {
    let i = 0;
    return mapPickerSections.map((section) => ({
      ...section,
      mapsWithIndex: section.maps.map((m) => ({ m, staggerIndex: i++ })),
    }));
  }, [mapPickerSections]);

  const prefersReducedMotion = usePrefersReducedMotion();

  const nadeRowStagger = React.useMemo(
    () => ({
      fadeDirection: "left" as const,
      chainFromZero: true,
      baseDelay: 0,
      incrementDelay: 0.07,
      reducedMotion: prefersReducedMotion,
    }),
    [prefersReducedMotion],
  );

  const mapping = React.useMemo(
    () => radarNormMappingForMap(selectedMap?.slug ?? initialMapSlug),
    [selectedMap?.slug, initialMapSlug],
  );

  const [grenadeType, setGrenadeType] = React.useState<GrenadeType | null>(
    null,
  );
  const [side, setSide] = React.useState<SideType | null>(null);
  const [movement, setMovement] = React.useState<MovementType | null>(null);
  const [techniqueJump, setTechniqueJump] =
    React.useState<TechniqueJumpSelection | null>(null);
  const [techniqueClick, setTechniqueClick] =
    React.useState<TechniqueClickChoice | null>(null);
  const [margin, setMargin] = React.useState<MarginType | null>(null);
  const [description, setDescription] = React.useState("");
  const [enqueueLoading, setEnqueueLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false);

  const video = useUploadWizardVideoState(setError);
  const radar = useUploadWizardRadarState({ mapping, selectedMapSlug });
  const stills = useUploadWizardStillsState({
    timeline: video.timeline,
    setTimeline: video.setTimeline,
  });
  const resetVideo = video.reset;
  const resetRadar = radar.reset;
  const resetStills = stills.reset;

  const resolvedTechnique = React.useMemo((): TechniqueType | null => {
    if (techniqueJump === null || techniqueClick === null) return null;
    return buildTechnique(
      techniqueJump === "jumping",
      techniqueClick,
    );
  }, [techniqueJump, techniqueClick]);

  const nadeDetailActiveRow = React.useMemo((): NadeDetailActiveRow | null => {
    if (stepIndex !== STEP_INDEX_NADE_DETAILS) return null;
    if (side === null) return "side";
    if (grenadeType === null) return "grenade";
    if (movement === null) return "movement";
    if (resolvedTechnique === null) return "technique";
    if (margin === null) return "margin";
    return null;
  }, [stepIndex, side, grenadeType, movement, resolvedTechnique, margin]);

  const resetNadeDetails = React.useCallback(() => {
    setGrenadeType(null);
    setSide(null);
    setMovement(null);
    setTechniqueJump(null);
    setTechniqueClick(null);
    setMargin(null);
    setDescription("");
  }, []);

  React.useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setSelectedMapSlug(null);
      resetNadeDetails();
      resetVideo();
      resetRadar();
      resetStills();
      setEnqueueLoading(false);
      setError(null);
      setConfirmCloseOpen(false);
      return;
    }
    const match = maps.find((m) => m.slug === initialMapSlug);
    setSelectedMapSlug(match ? initialMapSlug : (maps[0]?.slug ?? null));
  }, [
    open,
    initialMapSlug,
    maps,
    resetNadeDetails,
    resetVideo,
    resetRadar,
    resetStills,
  ]);

  const isDirty =
    stepIndex > 0 ||
    video.file !== null ||
    radar.throwNorm !== null ||
    radar.landNorm !== null ||
    radar.throwLabel.trim() !== "" ||
    radar.landLabel.trim() !== "" ||
    description.trim() !== "" ||
    video.enemyPovFile !== null ||
    video.enemyPovDescription.trim() !== "";

  const handleSheetOpenChange = React.useCallback(
    (next: boolean) => {
      if (next) {
        onOpenChange(true);
        return;
      }
      if (isDirty) {
        setConfirmCloseOpen(true);
        return;
      }
      onOpenChange(false);
    },
    [isDirty, onOpenChange],
  );

  const confirmAbandon = React.useCallback(() => {
    void track("utility_upload_wizard_abandoned", {
      step_index: stepIndex,
      map_slug: selectedMap?.slug ?? initialMapSlug,
    });
    setConfirmCloseOpen(false);
    onOpenChange(false);
  }, [stepIndex, selectedMap?.slug, initialMapSlug, onOpenChange]);

  const validationSnapshot = React.useMemo(
    () => ({
      selectedMapSlug,
      file: video.file,
      timeline: video.timeline,
      videoDurationMs: video.videoDurationMs,
      side,
      grenadeType,
      movement,
      techniqueJump,
      techniqueClick,
      margin,
      throwNorm: radar.throwNorm,
      throwLabel: radar.throwLabel,
      landNorm: radar.landNorm,
      landLabel: radar.landLabel,
      enemyPovFile: video.enemyPovFile,
      enemyPovTimeline: video.enemyPovTimeline,
      enemyPovDurationMs: video.enemyPovDurationMs,
      description,
    }),
    [
      selectedMapSlug,
      video.file,
      video.timeline,
      video.videoDurationMs,
      side,
      grenadeType,
      movement,
      techniqueJump,
      techniqueClick,
      margin,
      radar.throwNorm,
      radar.throwLabel,
      radar.landNorm,
      radar.landLabel,
      video.enemyPovFile,
      video.enemyPovTimeline,
      video.enemyPovDurationMs,
      description,
    ],
  );

  const validateStep = React.useCallback(
    (i: number): string | null => {
      return validateUploadWizardStep(i, validationSnapshot);
    },
    [validationSnapshot],
  );

  const canNavigateToStep = React.useCallback(
    (target: number): boolean => {
      return canNavigateToUploadWizardStep(target, validationSnapshot);
    },
    [validationSnapshot],
  );

  const enqueue = React.useCallback(async () => {
    const v = validateStep(STEP_INDEX_REVIEW);
    if (v) {
      setError(v);
      return;
    }
    if (
      !video.file ||
      !radar.throwNorm ||
      !radar.landNorm ||
      !selectedMap ||
      !grenadeType ||
      !side ||
      !movement ||
      !resolvedTechnique ||
      !margin
    ) {
      setError("Missing required fields.");
      return;
    }

    setEnqueueLoading(true);
    setError(null);

    const result = await runUploadWizardEnqueue({
      file: video.file,
      throwNorm: radar.throwNorm,
      landNorm: radar.landNorm,
      selectedMap,
      throwLabel: radar.throwLabel,
      landLabel: radar.landLabel,
      grenadeType,
      side,
      movement,
      resolvedTechnique,
      margin,
      timeline: video.timeline,
      description,
      enemyPovFile: video.enemyPovFile,
      enemyPovDescription: video.enemyPovDescription,
      enemyPovTimeline: video.enemyPovTimeline,
      onOpenChange,
    });

    setEnqueueLoading(false);
    if (!result.ok) {
      setError(result.message);
    }
  }, [
    validateStep,
    video.file,
    video.timeline,
    video.enemyPovFile,
    video.enemyPovDescription,
    video.enemyPovTimeline,
    radar.throwNorm,
    radar.landNorm,
    radar.throwLabel,
    radar.landLabel,
    selectedMap,
    grenadeType,
    side,
    movement,
    resolvedTechnique,
    margin,
    description,
    onOpenChange,
  ]);

  const stepErr = validateStep(stepIndex);
  const throwStillDialogMeta = stills.throwStillDialogSlot
    ? THROW_STILL_SLOTS.find((s) => s.slot === stills.throwStillDialogSlot)
    : undefined;
  const throwStillConfirmMeta = stills.throwStillConfirmSlot
    ? THROW_STILL_SLOTS.find((s) => s.slot === stills.throwStillConfirmSlot)
    : undefined;
  const landStillDialogMeta = stills.landStillDialogSlot
    ? LAND_STILL_SLOTS.find((s) => s.slot === stills.landStillDialogSlot)
    : undefined;
  const landStillConfirmMeta = stills.landStillConfirmSlot
    ? LAND_STILL_SLOTS.find((s) => s.slot === stills.landStillConfirmSlot)
    : undefined;
  const grenadeLabelForThrowStills = grenadeType
    ? (GRENADE_TYPE_OPTIONS.find((o) => o.value === grenadeType)?.label.toLowerCase() ??
      "utility")
    : "utility";
  const headerContextName = selectedMap?.displayName ?? initialDisplayName;

  return {
    open,
    onOpenChange,
    maps,
    initialMapSlug,
    initialDisplayName,
    initialRadarImageUrl,
    stepIndex,
    setStepIndex,
    selectedMapSlug,
    setSelectedMapSlug,
    selectedMap,
    mapPickerSectionsWithStagger,
    prefersReducedMotion,
    nadeRowStagger,
    dialogRadarImgRef: radar.dialogRadarImgRef,
    recomputeDialogRadarLayout: radar.recomputeDialogRadarLayout,
    radarDialogKind: radar.radarDialogKind,
    pendingRadarNorm: radar.pendingRadarNorm,
    throwSpotNamingOpen: radar.throwSpotNamingOpen,
    setThrowSpotNamingOpen: radar.setThrowSpotNamingOpen,
    throwSpotLabelDraft: radar.throwSpotLabelDraft,
    setThrowSpotLabelDraft: radar.setThrowSpotLabelDraft,
    landSpotNamingOpen: radar.landSpotNamingOpen,
    setLandSpotNamingOpen: radar.setLandSpotNamingOpen,
    landSpotLabelDraft: radar.landSpotLabelDraft,
    setLandSpotLabelDraft: radar.setLandSpotLabelDraft,
    throwStillDialogSlot: stills.throwStillDialogSlot,
    throwStillConfirmSlot: stills.throwStillConfirmSlot,
    landStillDialogSlot: stills.landStillDialogSlot,
    landStillConfirmSlot: stills.landStillConfirmSlot,
    throwNorm: radar.throwNorm,
    landNorm: radar.landNorm,
    grenadeType,
    setGrenadeType,
    side,
    setSide,
    movement,
    setMovement,
    techniqueJump,
    setTechniqueJump,
    techniqueClick,
    setTechniqueClick,
    resolvedTechnique,
    margin,
    setMargin,
    nadeDetailActiveRow,
    throwLabel: radar.throwLabel,
    landLabel: radar.landLabel,
    description,
    setDescription,
    timeline: video.timeline,
    setTimeline: video.setTimeline,
    file: video.file,
    videoDurationMs: video.videoDurationMs,
    enemyPovFile: video.enemyPovFile,
    setEnemyPovFile: video.setEnemyPovFile,
    enemyPovDescription: video.enemyPovDescription,
    setEnemyPovDescription: video.setEnemyPovDescription,
    enemyPovTimeline: video.enemyPovTimeline,
    setEnemyPovTimeline: video.setEnemyPovTimeline,
    enemyPovDurationMs: video.enemyPovDurationMs,
    enemyPovDragActive: video.enemyPovDragActive,
    setEnemyPovDragActive: video.setEnemyPovDragActive,
    enemyPovFileInputRef: video.enemyPovFileInputRef,
    enqueueLoading,
    error,
    confirmCloseOpen,
    setConfirmCloseOpen,
    videoFileInputRef: video.videoFileInputRef,
    videoDragActive: video.videoDragActive,
    setVideoDragActive: video.setVideoDragActive,
    videoPreviewShowControls: video.videoPreviewShowControls,
    setVideoPreviewShowControls: video.setVideoPreviewShowControls,
    videoCoarsePointer: video.videoCoarsePointer,
    acceptVideoFile: video.acceptVideoFile,
    acceptEnemyPovFile: video.acceptEnemyPovFile,
    filePreviewUrl: video.filePreviewUrl,
    enemyPovFilePreviewUrl: video.enemyPovFilePreviewUrl,
    handleSheetOpenChange,
    confirmAbandon,
    openThrowRadarForPick: radar.openThrowRadarForPick,
    openLandRadarForPick: radar.openLandRadarForPick,
    onDialogRadarClick: radar.onDialogRadarClick,
    dialogPinOverlayStyle: radar.dialogPinOverlayStyle,
    landRadarOverlaySvgPoint: radar.landRadarOverlaySvgPoint,
    landRadarThrowPinStyle: radar.landRadarThrowPinStyle,
    throwRadarPositionComplete: radar.throwRadarPositionComplete,
    landRadarPositionComplete: radar.landRadarPositionComplete,
    openThrowStillDialog: stills.openThrowStillDialog,
    openLandStillDialog: stills.openLandStillDialog,
    onLandStillDialogOpenChange: stills.onLandStillDialogOpenChange,
    proceedLandStillToConfirm: stills.proceedLandStillToConfirm,
    confirmLandStillFinal: stills.confirmLandStillFinal,
    onLandStillConfirmOpenChange: stills.onLandStillConfirmOpenChange,
    onThrowStillDialogOpenChange: stills.onThrowStillDialogOpenChange,
    proceedThrowStillToConfirm: stills.proceedThrowStillToConfirm,
    confirmThrowStillFinal: stills.confirmThrowStillFinal,
    onThrowStillConfirmOpenChange: stills.onThrowStillConfirmOpenChange,
    handleRadarDialogOk: radar.handleRadarDialogOk,
    handleThrowSpotNamingConfirm: radar.handleThrowSpotNamingConfirm,
    handleLandSpotNamingConfirm: radar.handleLandSpotNamingConfirm,
    closeRadarDialog: radar.closeRadarDialog,
    validateStep,
    canNavigateToStep,
    enqueue,
    stepErr,
    throwStillDialogMeta,
    throwStillConfirmMeta,
    landStillDialogMeta,
    landStillConfirmMeta,
    grenadeLabelForThrowStills,
    headerContextName,
    setVideoDurationMs: video.setVideoDurationMs,
    setEnemyPovDurationMs: video.setEnemyPovDurationMs,
  };
}
