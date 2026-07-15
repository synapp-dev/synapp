import {
  type UtilityLineupPreviewKeys,
} from "@/entities/utility-lineups/lib/use-shift-held";
import {
  type UtilityLineupTimelineScrubberValues,
} from "@/entities/utility-lineups/components/utility-lineup-video-timeline-scrubber";

import type {
  UtilityClientCluster,
  UtilityClientLineup,
} from "./types";

/** Video time from grenade release → bloom (smoke in flight); seconds string or null if unknown. */
export function formatUtilityLineupAirTravelSeconds(lineup: {
  grenadeReleaseMs: number | null;
  grenadeBloomMs: number | null;
}): string | null {
  const r = lineup.grenadeReleaseMs;
  const b = lineup.grenadeBloomMs;
  if (r == null || b == null) return null;
  const deltaMs = b - r;
  if (!Number.isFinite(deltaMs) || deltaMs < 0) return null;
  return (deltaMs / 1000).toFixed(1);
}

const LAND_SMOKE_ICON_T = "/images/icons/t-smoke.svg";
const LAND_SMOKE_ICON_CT = "/images/icons/ct-smoke.svg";
const LAND_SMOKE_ICON_MIXED = "/images/icons/t-and-ct-smoke.svg";

/** Land marker art: combined smoke when proximity-merged; else CT vs T by majority at one pixel. */
export function landSmokeIconForCluster(
  cluster: UtilityClientCluster,
  lineupsById: Record<string, UtilityClientLineup>,
): string {
  if (cluster.combineSidesVisual) {
    return LAND_SMOKE_ICON_MIXED;
  }
  let ct = 0;
  let t = 0;
  for (const id of cluster.lineupIds) {
    const s = lineupsById[id]?.side;
    if (s === "ct") ct++;
    else if (s === "t") t++;
    else if (s === "both") {
      ct++;
      t++;
    }
  }
  if (ct === 0 && t === 0) return LAND_SMOKE_ICON_T;
  return ct > t ? LAND_SMOKE_ICON_CT : LAND_SMOKE_ICON_T;
}

/**
 * Fullscreen (Ctrl) lineup view: frozen throw still + the same auto zoom + reticle sequence as
 * Shift-lineup on the card — not live A/D stand/land switching.
 */
export const FULLSCREEN_LINEUP_PREVIEW_KEYS = {
  lineupStill: true,
  startStill: false,
  landStill: false,
} as const satisfies UtilityLineupPreviewKeys;

export function clampUtilityPreviewVideoTimeSec(v: HTMLVideoElement, ms: number) {
  const dur = v.duration;
  const tSec = ms / 1000;
  const safeDur = Number.isFinite(dur) && dur > 0 ? dur : 0;
  return safeDur > 0
    ? Math.min(Math.max(0, tSec), Math.max(0, safeDur - 1 / 60))
    : Math.max(0, tSec);
}

/** Dotted line + throw pin — orange (T) vs blue (CT). `both` uses T styling. */
export function utilityThrowAccent(side: string): {
  stroke: string;
  pinClasses: string;
} {
  if (side === "ct") {
    return {
      stroke: "rgb(59 130 246)",
      pinClasses:
        "border-blue-400 bg-blue-200/95 text-blue-950 hover:bg-blue-100",
    };
  }
  return {
    stroke: "rgb(249 115 22)",
    pinClasses:
      "border-orange-400 bg-orange-200/95 text-orange-950 hover:bg-orange-100",
  };
}

/** Softer travelling “fade” pulse along the segment (under the dashed stroke). */
export function utilityTravelPulseStroke(side: string): string {
  if (side === "ct") return "rgba(165, 215, 254, 0.82)";
  return "rgba(254, 199, 154, 0.82)";
}

export function lineupToTimelineValues(
  lineup: UtilityClientLineup,
): UtilityLineupTimelineScrubberValues {
  return {
    videoStartMs: lineup.videoStartMs,
    videoEndMs: lineup.videoEndMs,
    stillStandMs: lineup.stillStandMs,
    stillThrowMs: lineup.stillThrowMs,
    stillLandMs: lineup.stillLandMs,
    grenadeReleaseMs: lineup.grenadeReleaseMs,
    grenadeBloomMs: lineup.grenadeBloomMs,
  };
}
