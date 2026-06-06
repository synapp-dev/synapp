import type { UtilityLineupTimelineScrubberValues } from "@/entities/utility-lineups/components/utility-lineup-video-timeline-scrubber";
import type { UtilityLineupUploadJobCreateInput } from "@/entities/utility-lineups/lib/user-lineup-submit-schema";

export type GrenadeType = UtilityLineupUploadJobCreateInput["grenadeType"];
export type SideType = UtilityLineupUploadJobCreateInput["side"];
export type MovementType = UtilityLineupUploadJobCreateInput["movement"];
export type TechniqueType = UtilityLineupUploadJobCreateInput["technique"];
export type MarginType = UtilityLineupUploadJobCreateInput["margin"];

export type UtilityMapPickerOption = {
  id: string;
  slug: string;
  displayName: string;
  /** `map_pools.slug` — groups the picker like `/utility`. */
  poolSlug: string;
  /** Display label for pool (e.g. Active Duty) — used for grouping only. */
  poolCategory: string;
  /** Map badge — step 1 picker only (`UtilityMapList` pattern). */
  badgeImageUrl?: string | null;
  /** Radar — throw/land steps only. */
  radarImageUrl: string;
  /** Optional hero image — same asset as utility map cards when set. */
  mapScreenshotUrl?: string | null;
};

export type TechniqueClickChoice = "left" | "right" | "both";

export type TechniqueJumpSelection = "standing" | "jumping";

export type NadeDetailActiveRow =
  | "side"
  | "grenade"
  | "movement"
  | "technique"
  | "margin";

export type ThrowStillSlot = "stand" | "lineup" | "release";

export type LandStillSlot = "landStill" | "bloom";

/** Snapshot of wizard state used for step validation. */
export type UploadWizardValidationSnapshot = {
  selectedMapSlug: string | null;
  file: File | null;
  timeline: UtilityLineupTimelineScrubberValues;
  videoDurationMs: number | null;
  side: SideType | null;
  grenadeType: GrenadeType | null;
  movement: MovementType | null;
  techniqueJump: TechniqueJumpSelection | null;
  techniqueClick: TechniqueClickChoice | null;
  margin: MarginType | null;
  throwNorm: { x: number; y: number } | null;
  throwLabel: string;
  landNorm: { x: number; y: number } | null;
  landLabel: string;
  enemyPovFile: File | null;
  enemyPovTimeline: { videoStartMs: number; videoEndMs: number | null };
  enemyPovDurationMs: number | null;
  description: string;
};
