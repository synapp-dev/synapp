import { cn } from "@workspace/ui/lib/utils";

import type { UtilityLineupTimelineScrubberValues } from "@/entities/utility-lineups/components/utility-lineup-video-timeline-scrubber";
import type { UtilityLineupUploadJobCreateInput } from "@/entities/utility-lineups/lib/user-lineup-submit-schema";
import {
  isAllowedUtilityLineupVideoMime,
} from "@/lib/media/utility-lineup-video-validation";

import {
  STEP_INDEX_CHOOSE_MAP,
  STEP_INDEX_ENEMY_POV,
  STEP_INDEX_LAND,
  STEP_INDEX_NADE_DETAILS,
  STEP_INDEX_REVIEW,
  STEP_INDEX_THROW,
  STEP_INDEX_UPLOAD_VIDEO,
} from "./constants";
import type {
  LandStillSlot,
  SideType,
  TechniqueClickChoice,
  TechniqueType,
  ThrowStillSlot,
  UploadWizardValidationSnapshot,
} from "./types";

/** Match `utilityThrowAccent` / `utilityTravelPulseStroke` on the utility map radar. */
export function landRadarThrowLineStroke(side: SideType | null): string {
  if (side === "ct") return "rgb(59 130 246)";
  return "rgb(249 115 22)";
}

export function landRadarTravelPulseStroke(side: SideType | null): string {
  if (side === "ct") return "rgba(165, 215, 254, 0.82)";
  return "rgba(254, 199, 154, 0.82)";
}

export function throwRadarPinPalette(side: SideType | null): {
  core: string;
  ring: string;
} {
  switch (side) {
    case "ct":
      return {
        core: "border-background bg-blue-500 shadow",
        ring: "border-blue-400",
      };
    case "t":
      return {
        core: "border-background bg-orange-500 shadow",
        ring: "border-orange-400",
      };
    case "both":
      return {
        core: "border-background bg-gradient-to-br from-blue-500 to-orange-500 shadow",
        ring: "border-white/55",
      };
    default:
      return {
        core: "border-background bg-orange-500 shadow",
        ring: "border-orange-400",
      };
  }
}

export function buildTechnique(
  jumping: boolean,
  click: TechniqueClickChoice,
): TechniqueType {
  if (!jumping) {
    switch (click) {
      case "left":
        return "left_click";
      case "right":
        return "right_click";
      case "both":
        return "left_and_right_click";
      default: {
        const _n: never = click;
        return _n;
      }
    }
  }
  switch (click) {
    case "left":
      return "jump_left_click";
    case "right":
      return "jump_right_click";
    case "both":
      return "jump_left_and_right_click";
    default: {
      const _n: never = click;
      return _n;
    }
  }
}

export function nadeDetailRowLabelClass(active: boolean, reducedMotion: boolean) {
  return cn(
    "text-xs font-normal transition-colors",
    active
      ? cn(
          "font-medium text-orange-500 dark:text-orange-400",
          !reducedMotion && "animate-pulse",
        )
      : "text-muted-foreground",
  );
}

export function wizardLineupDetailTileClass(
  selected: boolean,
  extraClassName?: string,
) {
  return cn(
    "border text-left transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    selected
      ? "border-primary/45 bg-background text-foreground shadow-md ring-1 ring-primary/20"
      : cn(
          "border-border/70 bg-muted/30 text-muted-foreground ring-1 ring-transparent",
          "opacity-80 hover:border-border hover:bg-muted/50 hover:opacity-100 hover:text-foreground",
        ),
    "rounded-xl",
    extraClassName,
  );
}

export function initialTimeline(): UtilityLineupTimelineScrubberValues {
  return {
    videoStartMs: 0,
    videoEndMs: null,
    stillStandMs: null,
    stillThrowMs: null,
    stillLandMs: null,
    grenadeReleaseMs: null,
    grenadeBloomMs: null,
  };
}

export function throwStillPickDescription(
  slot: ThrowStillSlot,
  grenadeLabelLower: string,
): string {
  switch (slot) {
    case "stand":
      return `Pause the video (facing the lineup, not in the actual lineup spot) of where the player should stand to throw the ${grenadeLabelLower}.`;
    case "lineup":
      return `Pause the video at the POV where your crosshair matches the throw — still from your stand, not in the lineup spot. Use the nudge buttons if you need to fine-tune. A tip is to select the frame just before the grenade camera appears.`;
    case "release":
      return `Pause the video at the moment the ${grenadeLabelLower} leaves your hand. Start from the frame where the grenade camera switches from the landing target to the flight path. Use the nudge buttons if you need to fine-tune.`;
    default: {
      const _n: never = slot;
      return _n;
    }
  }
}

export function landResultStillPickDescription(grenadeLabelLower: string): string {
  return `Pause the video on the frame that shows the end of the utility — e.g. flash has exploded, HE has exploded, molotov has reached full spread, or smoke has fully bloomed (whatever fits your ${grenadeLabelLower}). Use the nudge buttons if you need to fine-tune.`;
}

export function grenadeBloomPickDescription(grenadeLabelLower: string): string {
  return `Pause the video on the first frame where your ${grenadeLabelLower} has finished — smoke filled in, molotov spread, flash popped, or whatever fits that utility. Use the nudge buttons if you need to fine-tune. A tip is to use the first frame after the grenade camera disappears.`;
}

export function landStillPickDescription(
  slot: LandStillSlot,
  grenadeLabelLower: string,
): string {
  switch (slot) {
    case "landStill":
      return landResultStillPickDescription(grenadeLabelLower);
    case "bloom":
      return grenadeBloomPickDescription(grenadeLabelLower);
    default: {
      const _n: never = slot;
      return _n;
    }
  }
}

export function resolvedVideoContentType(
  file: File,
): UtilityLineupUploadJobCreateInput["videoContentType"] {
  if (file.type === "video/webm") return "video/webm";
  if (file.type === "video/quicktime") return "video/quicktime";
  return "video/mp4";
}

export function formatSecondsForInput(ms: number | null | undefined): string {
  if (ms == null) return "";
  return (ms / 1000).toFixed(1);
}

export function effectiveVideoMime(file: File): string {
  if (file.type && isAllowedUtilityLineupVideoMime(file.type)) {
    return file.type;
  }
  return resolvedVideoContentType(file);
}

export function validateTrimWindow(
  startMs: number,
  endMs: number | null,
  durationMs: number | null,
): string | null {
  if (startMs < 0) return "Start time can't be negative.";
  if (durationMs != null && startMs >= durationMs) {
    return "Start time must be before the end of the video.";
  }
  if (endMs != null) {
    if (endMs <= startMs) return "End time must be after start time.";
    if (durationMs != null && endMs > durationMs) {
      return "End time must be within the video.";
    }
  }
  return null;
}

export function validateUploadWizardStep(
  i: number,
  state: UploadWizardValidationSnapshot,
): string | null {
  switch (i) {
    case STEP_INDEX_CHOOSE_MAP:
      return state.selectedMapSlug ? null : "Select a map.";
    case STEP_INDEX_UPLOAD_VIDEO:
      if (!state.file) return "Choose a video file.";
      return validateTrimWindow(
        state.timeline.videoStartMs,
        state.timeline.videoEndMs ?? null,
        state.videoDurationMs,
      );
    case STEP_INDEX_NADE_DETAILS:
      if (!state.file) return "Upload a video first.";
      if (state.side === null) return "Select a side.";
      if (state.grenadeType === null) return "Select a grenade type.";
      if (state.movement === null) return "Select a movement type.";
      if (state.techniqueJump === null || state.techniqueClick === null)
        return "Choose standing or jumping and a click type.";
      if (state.margin === null) return "Select margin for error.";
      return null;
    case STEP_INDEX_THROW:
      if (!state.throwNorm) return "Place your throw on the radar.";
      if (!state.throwLabel.trim()) return "Enter a throw label.";
      if (state.timeline.stillStandMs == null)
        return "Set the frame showing where to stand.";
      if (state.timeline.stillThrowMs == null)
        return "Set the frame showing throw aim.";
      if (state.timeline.grenadeReleaseMs == null)
        return "Set when the grenade is released.";
      return null;
    case STEP_INDEX_LAND:
      if (!state.landNorm) return "Place your land spot on the radar.";
      if (!state.landLabel.trim()) return "Enter a land label.";
      if (state.timeline.stillLandMs == null)
        return "Set the land / result still frame.";
      if (state.timeline.grenadeBloomMs == null)
        return "Set when the grenade blooms.";
      return null;
    case STEP_INDEX_ENEMY_POV:
      if (!state.enemyPovFile) return null;
      return validateTrimWindow(
        state.enemyPovTimeline.videoStartMs,
        state.enemyPovTimeline.videoEndMs,
        state.enemyPovDurationMs,
      );
    case STEP_INDEX_REVIEW:
      return state.description.trim() ? null : "Enter a description.";
    default:
      return null;
  }
}

export function canNavigateToUploadWizardStep(
  target: number,
  state: UploadWizardValidationSnapshot,
): boolean {
  for (let j = 0; j < target; j++) {
    if (validateUploadWizardStep(j, state) !== null) return false;
  }
  return true;
}
