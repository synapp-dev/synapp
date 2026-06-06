import type * as React from "react";

import type { UtilityLineupTimelineScrubberValues } from "@/entities/utility-lineups/components/utility-lineup-video-timeline-scrubber";

import { LAND_STILL_SLOTS, THROW_STILL_SLOTS } from "./constants";
import type {
  GrenadeType,
  LandStillSlot,
  MarginType,
  MovementType,
  NadeDetailActiveRow,
  SideType,
  TechniqueClickChoice,
  TechniqueJumpSelection,
  TechniqueType,
  ThrowStillSlot,
  UtilityMapPickerOption,
} from "./types";

export type UploadWizardProviderProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  maps: UtilityMapPickerOption[];
  initialMapSlug: string;
  initialDisplayName: string;
  initialRadarImageUrl: string;
  children: React.ReactNode;
};

export type UploadWizardContextValue = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  maps: UtilityMapPickerOption[];
  initialMapSlug: string;
  initialDisplayName: string;
  initialRadarImageUrl: string;
  stepIndex: number;
  setStepIndex: React.Dispatch<React.SetStateAction<number>>;
  selectedMapSlug: string | null;
  setSelectedMapSlug: React.Dispatch<React.SetStateAction<string | null>>;
  selectedMap: UtilityMapPickerOption | undefined;
  mapPickerSectionsWithStagger: Array<{
    poolSlug: string;
    heading: string;
    mapsWithIndex: Array<{
      m: UtilityMapPickerOption;
      staggerIndex: number;
    }>;
  }>;
  prefersReducedMotion: boolean;
  nadeRowStagger: {
    fadeDirection: "left";
    chainFromZero: boolean;
    baseDelay: number;
    incrementDelay: number;
    reducedMotion: boolean;
  };
  dialogRadarImgRef: React.RefObject<HTMLImageElement | null>;
  recomputeDialogRadarLayout: () => void;
  radarDialogKind: "throw" | "land" | null;
  pendingRadarNorm: { x: number; y: number } | null;
  throwSpotNamingOpen: boolean;
  setThrowSpotNamingOpen: React.Dispatch<React.SetStateAction<boolean>>;
  throwSpotLabelDraft: string;
  setThrowSpotLabelDraft: React.Dispatch<React.SetStateAction<string>>;
  landSpotNamingOpen: boolean;
  setLandSpotNamingOpen: React.Dispatch<React.SetStateAction<boolean>>;
  landSpotLabelDraft: string;
  setLandSpotLabelDraft: React.Dispatch<React.SetStateAction<string>>;
  throwStillDialogSlot: ThrowStillSlot | null;
  throwStillConfirmSlot: ThrowStillSlot | null;
  landStillDialogSlot: LandStillSlot | null;
  landStillConfirmSlot: LandStillSlot | null;
  throwNorm: { x: number; y: number } | null;
  landNorm: { x: number; y: number } | null;
  grenadeType: GrenadeType | null;
  setGrenadeType: React.Dispatch<React.SetStateAction<GrenadeType | null>>;
  side: SideType | null;
  setSide: React.Dispatch<React.SetStateAction<SideType | null>>;
  movement: MovementType | null;
  setMovement: React.Dispatch<React.SetStateAction<MovementType | null>>;
  techniqueJump: TechniqueJumpSelection | null;
  setTechniqueJump: React.Dispatch<
    React.SetStateAction<TechniqueJumpSelection | null>
  >;
  techniqueClick: TechniqueClickChoice | null;
  setTechniqueClick: React.Dispatch<
    React.SetStateAction<TechniqueClickChoice | null>
  >;
  resolvedTechnique: TechniqueType | null;
  margin: MarginType | null;
  setMargin: React.Dispatch<React.SetStateAction<MarginType | null>>;
  nadeDetailActiveRow: NadeDetailActiveRow | null;
  throwLabel: string;
  landLabel: string;
  description: string;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
  timeline: UtilityLineupTimelineScrubberValues;
  setTimeline: React.Dispatch<
    React.SetStateAction<UtilityLineupTimelineScrubberValues>
  >;
  file: File | null;
  videoDurationMs: number | null;
  enemyPovFile: File | null;
  setEnemyPovFile: React.Dispatch<React.SetStateAction<File | null>>;
  enemyPovDescription: string;
  setEnemyPovDescription: React.Dispatch<React.SetStateAction<string>>;
  enemyPovTimeline: { videoStartMs: number; videoEndMs: number | null };
  setEnemyPovTimeline: React.Dispatch<
    React.SetStateAction<{ videoStartMs: number; videoEndMs: number | null }>
  >;
  enemyPovDurationMs: number | null;
  enemyPovDragActive: boolean;
  setEnemyPovDragActive: React.Dispatch<React.SetStateAction<boolean>>;
  enemyPovFileInputRef: React.RefObject<HTMLInputElement | null>;
  enqueueLoading: boolean;
  error: string | null;
  confirmCloseOpen: boolean;
  setConfirmCloseOpen: React.Dispatch<React.SetStateAction<boolean>>;
  videoFileInputRef: React.RefObject<HTMLInputElement | null>;
  videoDragActive: boolean;
  setVideoDragActive: React.Dispatch<React.SetStateAction<boolean>>;
  videoPreviewShowControls: boolean;
  setVideoPreviewShowControls: React.Dispatch<React.SetStateAction<boolean>>;
  videoCoarsePointer: boolean;
  acceptVideoFile: (candidate: File) => boolean;
  acceptEnemyPovFile: (candidate: File) => boolean;
  filePreviewUrl: string | null;
  enemyPovFilePreviewUrl: string | null;
  handleSheetOpenChange: (next: boolean) => void;
  confirmAbandon: () => void;
  openThrowRadarForPick: () => void;
  openLandRadarForPick: () => void;
  onDialogRadarClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  dialogPinOverlayStyle: React.CSSProperties | null;
  landRadarOverlaySvgPoint: (
    storedNx: number,
    storedNy: number,
  ) => { x: number; y: number };
  landRadarThrowPinStyle: React.CSSProperties | null;
  throwRadarPositionComplete: boolean;
  landRadarPositionComplete: boolean;
  openThrowStillDialog: (slot: ThrowStillSlot) => void;
  openLandStillDialog: (slot: LandStillSlot) => void;
  onLandStillDialogOpenChange: (next: boolean) => void;
  proceedLandStillToConfirm: () => void;
  confirmLandStillFinal: () => void;
  onLandStillConfirmOpenChange: (next: boolean) => void;
  onThrowStillDialogOpenChange: (next: boolean) => void;
  proceedThrowStillToConfirm: () => void;
  confirmThrowStillFinal: () => void;
  onThrowStillConfirmOpenChange: (next: boolean) => void;
  handleRadarDialogOk: () => void;
  handleThrowSpotNamingConfirm: () => void;
  handleLandSpotNamingConfirm: () => void;
  closeRadarDialog: () => void;
  validateStep: (i: number) => string | null;
  canNavigateToStep: (target: number) => boolean;
  enqueue: () => Promise<void>;
  stepErr: string | null;
  throwStillDialogMeta: (typeof THROW_STILL_SLOTS)[number] | undefined;
  throwStillConfirmMeta: (typeof THROW_STILL_SLOTS)[number] | undefined;
  landStillDialogMeta: (typeof LAND_STILL_SLOTS)[number] | undefined;
  landStillConfirmMeta: (typeof LAND_STILL_SLOTS)[number] | undefined;
  grenadeLabelForThrowStills: string;
  headerContextName: string;
  setVideoDurationMs: React.Dispatch<React.SetStateAction<number | null>>;
  setEnemyPovDurationMs: React.Dispatch<React.SetStateAction<number | null>>;
};
