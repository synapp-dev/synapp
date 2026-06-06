import type { LucideIcon } from "lucide-react";
import {
  Anchor,
  ChevronsDown,
  ClipboardCheck,
  CloudFog,
  Crosshair,
  Equal,
  Eye,
  FilmIcon,
  Flame,
  Footprints,
  Map,
  MapPin,
  Minus,
  Plus,
  Shuffle,
  SlidersHorizontal,
  Wind,
  Zap,
  Bomb,
} from "lucide-react";

import type { UtilityLineupTimelineScrubberValues } from "@/entities/utility-lineups/components/utility-lineup-video-timeline-scrubber";

import type {
  GrenadeType,
  LandStillSlot,
  MarginType,
  MovementType,
  ThrowStillSlot,
} from "./types";

export const STEP_LABELS = [
  "Choose Map",
  "Upload Video",
  "Nade Details",
  "Throw Lineup",
  "Land Lineup",
  "Enemy POV",
  "Review",
] as const;

/** Shown under “Upload lineup” — step names live in the sidebar only. */
export const STEP_INSTRUCTIONS = [
  "Tap a map to choose — tap again to clear. This page’s map is selected by default.",
  "Choose a lineup video file. Upload runs after you queue; this preview powers the timeline scrubber later.",
  "Set nade details before you pin radar spots and sync the video.",
  "Place the throw on the radar, name it, then set stand frame, throw aim, and when the grenade is released.",
  "Place where it lands on the radar, name it, then set the land/result and bloom stills (pick frame, confirm preview) like the throw step.",
  "Optional — drop in a video showing what this utility looks like from the enemy’s POV. Skip to keep the submission lineup-only.",
  "Add a description for moderators and players, confirm everything looks right, then queue the upload.",
] as const;

export const STEP_ICONS = [
  Map,
  FilmIcon,
  SlidersHorizontal,
  Crosshair,
  MapPin,
  Eye,
  ClipboardCheck,
] as const;

export const STEP_INDEX_CHOOSE_MAP = 0;
export const STEP_INDEX_UPLOAD_VIDEO = 1;
export const STEP_INDEX_NADE_DETAILS = 2;
export const STEP_INDEX_THROW = 3;
export const STEP_INDEX_LAND = 4;
export const STEP_INDEX_ENEMY_POV = 5;
export const STEP_INDEX_REVIEW = 6;

export const CT_SIDE_ICON_SRC = "/images/icons/ct-icon.webp";
export const T_SIDE_ICON_SRC = "/images/icons/t-icon.webp";

export const RECOMMENDED_CROSSHAIR_CODE =
  "CSGO-SM3kP-Vmtsi-fFtU4-6MGLJ-KuwTC";

export const GRENADE_TYPE_OPTIONS: {
  value: GrenadeType;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "smoke", label: "Smoke", icon: CloudFog },
  { value: "molotov", label: "Molotov", icon: Flame },
  { value: "flashbang", label: "Flashbang", icon: Zap },
  { value: "he", label: "HE", icon: Bomb },
];

export const MOVEMENT_OPTIONS: {
  value: MovementType;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "stationary", label: "Stationary", icon: Anchor },
  { value: "running", label: "Running", icon: Wind },
  { value: "walking", label: "Walking", icon: Footprints },
  { value: "crouched", label: "Crouched", icon: ChevronsDown },
  { value: "crouched_walking", label: "Crouch walk", icon: Shuffle },
];

export const MARGIN_OPTIONS: {
  value: MarginType;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "low", label: "Low", icon: Minus },
  { value: "medium", label: "Medium", icon: Equal },
  { value: "high", label: "High", icon: Plus },
];

export const THROW_STILL_SLOTS: {
  slot: ThrowStillSlot;
  marker: keyof UtilityLineupTimelineScrubberValues;
  title: string;
  caption: string;
}[] = [
  {
    slot: "stand",
    marker: "stillStandMs",
    title: "Stand position",
    caption: "Stand position screenshot",
  },
  {
    slot: "lineup",
    marker: "stillThrowMs",
    title: "Lineup position",
    caption: "Lineup position screenshot",
  },
  {
    slot: "release",
    marker: "grenadeReleaseMs",
    title: "Release moment",
    caption: "Release position screenshot",
  },
];

export const LAND_STILL_SLOTS: {
  slot: LandStillSlot;
  marker: keyof UtilityLineupTimelineScrubberValues;
  title: string;
  caption: string;
}[] = [
  {
    slot: "landStill",
    marker: "stillLandMs",
    title: "Land / result still",
    caption: "Land / result screenshot",
  },
  {
    slot: "bloom",
    marker: "grenadeBloomMs",
    title: "Grenade blooms",
    caption: "Bloom screenshot",
  },
];
