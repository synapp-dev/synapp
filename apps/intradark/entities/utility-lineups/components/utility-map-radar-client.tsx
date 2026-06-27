"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics/react";
import { Crosshair, Plane, ShieldCheck, Undo, X, ZoomIn } from "lucide-react";
import {
  type ReactZoomPanPinchContentRef,
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@workspace/ui/components/hover-card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";

import {
  updateUtilityLineupSpotsAction,
  updateUtilityLineupTimelineAction,
} from "@/entities/utility-lineups/actions/admin-utility-lineups-moderation-actions";
import {
  mapDisplayRadarNormToStored,
  mapStoredRadarNormToDisplay,
  radarNormMappingForMap,
} from "@/entities/utility-lineups/lib/radar-display-mapping";
import {
  clientPointToDisplayNormInObjectContain,
  displayNormToOverlayPercent,
  displayNormToSvgPercent,
} from "@/entities/utility-lineups/lib/radar-object-contain-layout";
import { useRadarImgLayout } from "@/entities/utility-lineups/lib/use-radar-img-layout";
import {
  resolveActiveStillPreviewTab,
  resolveStillPreviewMs,
  type StillPreviewTab,
} from "@/entities/utility-lineups/lib/utility-lineup-still-preview-ms";
import {
  type UtilityLineupPreviewKeys,
  useUtilityLineupPreviewKeys,
} from "@/entities/utility-lineups/lib/use-shift-held";
import {
  utilityLineupMovementTechniqueChainParts,
} from "@/entities/utility-lineups/lib/utility-lineup-throw-meta-labels";
import {
  buildYouTubeEmbedHoverPreviewSrc,
  buildYouTubeEmbedPausedPreviewSrc,
  buildYouTubeEmbedSrc,
} from "@/entities/utility-lineups/lib/youtube-embed";
import { intradarkMediaPublicUrl } from "@/lib/media/public-media-url";
import {
  UtilityLineupVideoTimelineScrubber,
  type UtilityLineupTimelineScrubberValues,
} from "@/entities/utility-lineups/components/utility-lineup-video-timeline-scrubber";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import CountUp from "react-countup";

/** Matches `initialScale` / reset — users cannot zoom out past the default framing. */
const MAP_BASE_SCALE = 1;

export type UtilityClientLineup = {
  id: string;
  grenadeType: string;
  side: string;
  movement: string;
  technique: string;
  margin: string;
  description: string;
  youtubeUrl: string | null;
  videoObjectPath: string | null;
  videoStartMs: number;
  videoEndMs: number | null;
  stillStandMs: number | null;
  stillThrowMs: number | null;
  stillLandMs: number | null;
  grenadeReleaseMs: number | null;
  grenadeBloomMs: number | null;
  lineupImageUrl: string | null;
  setposText: string | null;
  /** Normalized 0–1 on radar art */
  throwSpotX: number;
  throwSpotY: number;
  landSpotX: number;
  landSpotY: number;
  throwLabel: string;
  landLabel: string;
  intradarkVerified: boolean;
  proVerified: boolean;
  /** Author display name or username when `author_profile_id` is set. */
  uploadAuthorAlias: string | null;
  uploadAuthorAvatarUrl: string | null;
};

export type UtilityClientCluster = {
  clusterKey: string;
  count: number;
  lineupIds: string[];
  radarX: number;
  radarY: number;
  label: string;
  /** Nearby land pins merged → use combined T/CT smoke art */
  combineSidesVisual?: boolean;
};

/** Video time from grenade release → bloom (smoke in flight); seconds string or null if unknown. */
function formatUtilityLineupAirTravelSeconds(lineup: {
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

/** Throw-pin hover header: team badge for smoke lineups (public `/images` paths). */
const LINEUP_HOVER_CT_ICON = "/images/icons/ct-icon.webp";
const LINEUP_HOVER_T_ICON = "/images/icons/t-icon.webp";

function LineupSmokeSideIcons({
  side,
  grenadeType,
}: {
  side: string;
  grenadeType: string;
}) {
  if (grenadeType.toLowerCase() !== "smoke") return null;
  const s = side.toLowerCase();
  const cls = "h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8";
  if (s === "ct") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- static public icon
      <img src={LINEUP_HOVER_CT_ICON} alt="" className={cls} />
    );
  }
  if (s === "t") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- static public icon
      <img src={LINEUP_HOVER_T_ICON} alt="" className={cls} />
    );
  }
  if (s === "both") {
    return (
      <span className="flex shrink-0 items-center gap-0.5" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- static public icons */}
        <img
          src={LINEUP_HOVER_T_ICON}
          alt=""
          className="h-5 w-5 object-contain sm:h-6 sm:w-6"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- static public icons */}
        <img
          src={LINEUP_HOVER_CT_ICON}
          alt=""
          className="h-5 w-5 object-contain sm:h-6 sm:w-6"
        />
      </span>
    );
  }
  return null;
}

/** Land marker art: combined smoke when proximity-merged; else CT vs T by majority at one pixel. */
function landSmokeIconForCluster(
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

const SHIFT_STILL_ZOOM_DELAY_MS = 500;
const SHIFT_STILL_ZOOM_SCALE = 3;
const SHIFT_STILL_ZOOM_TRANSITION_MS = 500;
/** After zoom is active, wait this long (still holding Shift) before drawing lineup reticles. */
const SHIFT_STILL_RETICLE_DELAY_AFTER_ZOOM_MS = 2000;

/** Opacity fade-in when reticles mount (unless prefers-reduced-motion). */
const LINEUP_RETICLE_FADE_MS = 500;

/**
 * Fullscreen (Ctrl) lineup view: frozen throw still + the same auto zoom + reticle sequence as
 * Shift-lineup on the card — not live A/D stand/land switching.
 */
const FULLSCREEN_LINEUP_PREVIEW_KEYS = {
  lineupStill: true,
  startStill: false,
  landStill: false,
} as const satisfies UtilityLineupPreviewKeys;

const LINEUP_RETICLE_GREEN = "#39FF14";

/** Grid spans N steps per side to the frame edge; ticks and labels only when abs(k) is less than N (no outer ring). */
const RETICLE_X_STEPS_PER_SIDE = 5;
const RETICLE_Y_STEPS_PER_SIDE = 4;

function formatReticleStepLabel(k: number): string {
  return `${k}x`;
}

function LineupReticlesOverlay({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean;
}) {
  const [fadeIn, setFadeIn] = React.useState(prefersReducedMotion);

  React.useEffect(() => {
    if (prefersReducedMotion) return;
    const id = requestAnimationFrame(() => setFadeIn(true));
    return () => cancelAnimationFrame(id);
  }, [prefersReducedMotion]);

  const vb = 100;
  const c = vb / 2;
  const tickMajor = 1.35;
  const stroke = LINEUP_RETICLE_GREEN;

  const xAt = (k: number) => c + (k / RETICLE_X_STEPS_PER_SIDE) * c;
  const yAt = (k: number) => c + (k / RETICLE_Y_STEPS_PER_SIDE) * c;

  /** Inner integer steps only — excludes ±N at the viewport edge (no notch, no label there). */
  const xInnerKs = Array.from(
    { length: (RETICLE_X_STEPS_PER_SIDE - 1) * 2 + 1 },
    (_, i) => i - (RETICLE_X_STEPS_PER_SIDE - 1),
  );
  const yInnerKs = Array.from(
    { length: (RETICLE_Y_STEPS_PER_SIDE - 1) * 2 + 1 },
    (_, i) => i - (RETICLE_Y_STEPS_PER_SIDE - 1),
  );

  return (
    <svg
      className={cn(
        "pointer-events-none absolute inset-0 z-10 h-full w-full",
        prefersReducedMotion
          ? "opacity-100"
          : cn(
              "ease-out transition-opacity",
              fadeIn ? "opacity-100" : "opacity-0",
            ),
      )}
      style={
        prefersReducedMotion
          ? undefined
          : { transitionDuration: `${LINEUP_RETICLE_FADE_MS}ms` }
      }
      viewBox={`0 0 ${vb} ${vb}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <g
        stroke={stroke}
        strokeWidth={0.22}
        strokeLinecap="square"
        vectorEffect="nonScalingStroke"
      >
        <line x1={0} y1={c} x2={vb} y2={c} />
        <line x1={c} y1={0} x2={c} y2={vb} />
        {xInnerKs.map((k) => (
          <line
            key={`xmaj-${k}`}
            x1={xAt(k)}
            y1={c - tickMajor}
            x2={xAt(k)}
            y2={c + tickMajor}
          />
        ))}
        {yInnerKs.map((k) => (
          <line
            key={`ymaj-${k}`}
            x1={c - tickMajor}
            y1={yAt(k)}
            x2={c + tickMajor}
            y2={yAt(k)}
          />
        ))}
      </g>
      <g
        fill={stroke}
        fontSize={2.55}
        fontFamily="ui-monospace, monospace"
        fontWeight="600"
        stroke="none"
      >
        {xInnerKs
          .filter((k) => k !== 0)
          .map((k) => (
            <text
              key={`xlab-${k}`}
              x={xAt(k)}
              y={c + 3.2}
              textAnchor="middle"
              dominantBaseline="hanging"
            >
              {formatReticleStepLabel(k)}
            </text>
          ))}
        {yInnerKs
          .filter((k) => k !== 0)
          .map((k) => (
            <text
              key={`ylab-${k}`}
              x={c + 3.4}
              y={yAt(k)}
              textAnchor="start"
              dominantBaseline="middle"
            >
              {formatReticleStepLabel(k)}
            </text>
          ))}
      </g>
    </svg>
  );
}

/** After Shift is held: optional delay, then ease-scale still preview from center (“zoom in ~50%”). */
function ShiftHoldStillZoom({
  active,
  prefersReducedMotion,
  reticlesEnabled = true,
  instantTiming = false,
  children,
}: {
  active: boolean;
  prefersReducedMotion: boolean;
  /** When false, lineup grid overlay is never shown (fullscreen toggle). */
  reticlesEnabled?: boolean;
  /**
   * Fullscreen manual toggles: no intro delays. When false, use delayed zoom + reticle sequence
   * (e.g. first paint after opening the dialog).
   */
  instantTiming?: boolean;
  children: React.ReactNode;
}) {
  const [zoomEngaged, setZoomEngaged] = React.useState(false);
  const [reticlesVisible, setReticlesVisible] = React.useState(false);

  React.useLayoutEffect(() => {
    if (!active) {
      setZoomEngaged(false);
      return;
    }
    if (instantTiming || prefersReducedMotion) {
      setZoomEngaged(true);
      return;
    }
    const id = window.setTimeout(
      () => setZoomEngaged(true),
      SHIFT_STILL_ZOOM_DELAY_MS,
    );
    return () => clearTimeout(id);
  }, [active, prefersReducedMotion, instantTiming]);

  React.useLayoutEffect(() => {
    if (!active || !zoomEngaged || !reticlesEnabled) {
      setReticlesVisible(false);
      return;
    }
    if (instantTiming) {
      setReticlesVisible(true);
      return;
    }
    const id = window.setTimeout(() => {
      setReticlesVisible(true);
    }, SHIFT_STILL_RETICLE_DELAY_AFTER_ZOOM_MS);
    return () => clearTimeout(id);
  }, [active, zoomEngaged, reticlesEnabled, instantTiming]);

  const scale = active && zoomEngaged ? SHIFT_STILL_ZOOM_SCALE : 1;

  return (
    <div className="relative h-full min-h-0 w-full min-w-0 overflow-hidden">
      <div
        className="flex h-full w-full origin-center items-center justify-center will-change-transform"
        style={{
          transform: `scale(${scale})`,
          transition:
            prefersReducedMotion || !active
              ? undefined
              : `transform ${
                  instantTiming ? 200 : SHIFT_STILL_ZOOM_TRANSITION_MS
                }ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      >
        <div className="h-full w-full min-h-0 min-w-0">{children}</div>
      </div>
      {reticlesVisible && reticlesEnabled ? (
        <LineupReticlesOverlay prefersReducedMotion={prefersReducedMotion} />
      ) : null}
    </div>
  );
}

function clampUtilityPreviewVideoTimeSec(v: HTMLVideoElement, ms: number) {
  const dur = v.duration;
  const tSec = ms / 1000;
  const safeDur = Number.isFinite(dur) && dur > 0 ? dur : 0;
  return safeDur > 0
    ? Math.min(Math.max(0, tSec), Math.max(0, safeDur - 1 / 60))
    : Math.max(0, tSec);
}

/** Top-right brand lockup (matches `AppSidebar` header: symbol + wordmark). */
function UtilityPreviewVideoWordmark() {
  const shadow =
    "[filter:drop-shadow(0_1px_2px_rgb(0_0_0_/_0.65))_drop-shadow(0_2px_6px_rgb(0_0_0_/_0.6))]";
  return (
    <div
      className="pointer-events-none absolute z-20 flex items-start gap-1 sm:right-4 sm:top-4"
      aria-hidden
    >
      <Image
        src="/images/logos/intradark-symbol-blue.svg"
        alt=""
        width={20}
        height={20}
        className={cn("h-auto w-2 shrink-0 animate-spin-slow mt-0.5", shadow)}
      />
      <Image
        src="/images/logos/intradark-wordmark-white.svg"
        alt=""
        width={100}
        height={20}
        className={cn("h-auto w-16 shrink-0 opacity-[0.92] sm:h-4", shadow)}
      />
    </div>
  );
}

function ThrowPinHoverPreviewMedia({
  lineup: L,
  hoverYouTubeSrc,
  hoverStorageSrc,
  prefersReducedMotion,
  previewKeys,
  fullscreenLineup,
  frameClassName,
  /** When false, skip iframe/video and canvas-still capture (saves GPU/RAM until hover/fullscreen). */
  heavyMediaActive = true,
}: {
  lineup: UtilityClientLineup;
  hoverYouTubeSrc: string | null;
  hoverStorageSrc: string | null;
  prefersReducedMotion: boolean;
  previewKeys: UtilityLineupPreviewKeys;
  /** Fullscreen (Ctrl): optional zoom / reticle toggles; hover card omits this. */
  fullscreenLineup?: {
    zoomed: boolean;
    reticlesOn: boolean;
    /** Manual toggles skip intro delays; false = first-open delayed sequence. */
    instantTiming: boolean;
  } | null;
  frameClassName?: string;
  heavyMediaActive?: boolean;
}) {
  const activeStillTab = resolveActiveStillPreviewTab(previewKeys);
  const isStillMode = activeStillTab !== null;

  const resolvedMs = React.useMemo(() => {
    if (!activeStillTab) return 0;
    return resolveStillPreviewMs(L, activeStillTab);
  }, [L, activeStillTab]);

  const baseLineupZoomActive =
    previewKeys.lineupStill && activeStillTab === "throw";
  const zoomLineupActive =
    fullscreenLineup != null
      ? baseLineupZoomActive && fullscreenLineup.zoomed
      : baseLineupZoomActive;

  const wrapStillChild = (child: React.ReactNode) => {
    if (!isStillMode) return child;
    if (zoomLineupActive) {
      return (
        <ShiftHoldStillZoom
          active={zoomLineupActive}
          prefersReducedMotion={prefersReducedMotion}
          reticlesEnabled={fullscreenLineup?.reticlesOn ?? true}
          instantTiming={fullscreenLineup?.instantTiming ?? false}
        >
          {child}
        </ShiftHoldStillZoom>
      );
    }
    return <>{child}</>;
  };

  /** After releasing A/D/Shift, autoplay starts from this ms (editorial trim otherwise). */
  const [resumePlaybackMs, setResumePlaybackMs] = React.useState<number | null>(
    null,
  );
  const lastStillTabRef = React.useRef<StillPreviewTab | null>(null);
  const prevIsStillRef = React.useRef(isStillMode);
  const baseStorageVideoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    setResumePlaybackMs(null);
  }, [L.id]);

  React.useEffect(() => {
    if (isStillMode && activeStillTab != null) {
      lastStillTabRef.current = activeStillTab;
    }
  }, [isStillMode, activeStillTab]);

  /** Keys held: paused at timestamp; released: autoplay from resumePlaybackMs ?? trim start. */
  const youtubeEmbedSrc = React.useMemo(() => {
    if (!L.youtubeUrl?.trim()) return null;
    if (isStillMode) {
      return buildYouTubeEmbedPausedPreviewSrc(
        L.youtubeUrl,
        resolvedMs,
        L.videoEndMs,
      );
    }
    const startMs = resumePlaybackMs ?? L.videoStartMs;
    return prefersReducedMotion
      ? buildYouTubeEmbedSrc(L.youtubeUrl, startMs, L.videoEndMs)
      : buildYouTubeEmbedHoverPreviewSrc(L.youtubeUrl, startMs, L.videoEndMs);
  }, [
    isStillMode,
    resolvedMs,
    L.youtubeUrl,
    L.videoEndMs,
    L.videoStartMs,
    prefersReducedMotion,
    resumePlaybackMs,
  ]);

  React.useLayoutEffect(() => {
    const wasStill = prevIsStillRef.current;
    prevIsStillRef.current = isStillMode;
    if (!wasStill || isStillMode) return;

    const tab = lastStillTabRef.current;
    if (tab == null) return;

    const ms = resolveStillPreviewMs(L, tab);
    setResumePlaybackMs(ms);
  }, [isStillMode, L]);

  React.useEffect(() => {
    const v = baseStorageVideoRef.current;
    if (!v || !hoverStorageSrc || !heavyMediaActive) return;
    if (!isStillMode) return;

    const applyStill = () => {
      v.currentTime = clampUtilityPreviewVideoTimeSec(v, resolvedMs);
      void v.pause();
    };

    if (v.readyState >= HTMLMediaElement.HAVE_METADATA) applyStill();
    else v.addEventListener("loadedmetadata", applyStill, { once: true });
  }, [isStillMode, resolvedMs, hoverStorageSrc, heavyMediaActive]);

  React.useEffect(() => {
    const v = baseStorageVideoRef.current;
    if (!v || !hoverStorageSrc || !heavyMediaActive) return;
    if (isStillMode) return;

    const startMs = resumePlaybackMs ?? L.videoStartMs;
    const applyPlay = () => {
      v.currentTime = clampUtilityPreviewVideoTimeSec(v, startMs);
      if (!prefersReducedMotion) void v.play();
      else void v.pause();
    };

    if (v.readyState >= HTMLMediaElement.HAVE_METADATA) applyPlay();
    else v.addEventListener("loadedmetadata", applyPlay, { once: true });
  }, [
    isStillMode,
    hoverStorageSrc,
    heavyMediaActive,
    resumePlaybackMs,
    L.videoStartMs,
    prefersReducedMotion,
  ]);

  if (!heavyMediaActive && (hoverYouTubeSrc || hoverStorageSrc)) {
    return (
      <div
        className={cn(
          "relative aspect-video w-full overflow-hidden bg-black [transform:translateZ(0)]",
          frameClassName,
        )}
      >
        <div
          className="flex h-full min-h-[120px] w-full items-center justify-center bg-zinc-950"
          aria-hidden
        />
      </div>
    );
  }

  if (hoverYouTubeSrc) {
    /** Keys held: paused embed at timestamp; released: autoplay embed from that timestamp. */
    const sharedFrame = cn(
      "relative aspect-video w-full overflow-hidden bg-black [transform:translateZ(0)]",
      frameClassName,
    );

    const embedSrc = youtubeEmbedSrc ?? hoverYouTubeSrc;

    const ytIframe = (
      <iframe
        key={`yt-${L.id}-${isStillMode ? `pause-${resolvedMs}` : `play-${resumePlaybackMs ?? "init"}`}`}
        title={`Preview: ${L.throwLabel}`}
        src={embedSrc}
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );

    return (
      <div className={cn(sharedFrame)}>
        {wrapStillChild(ytIframe)}
        <UtilityPreviewVideoWordmark />
      </div>
    );
  }

  if (hoverStorageSrc) {
    const sharedFrame = cn(
      "relative aspect-video w-full overflow-hidden bg-black [transform:translateZ(0)]",
      frameClassName,
    );

    const storageVideo = (
      <video
        ref={baseStorageVideoRef}
        src={hoverStorageSrc}
        className="absolute inset-0 h-full w-full object-contain [transform:translateZ(0)]"
        muted
        playsInline
        loop
        autoPlay={false}
        controls={false}
        preload="auto"
      />
    );

    return (
      <div className={cn(sharedFrame)}>
        {wrapStillChild(storageVideo)}
        <UtilityPreviewVideoWordmark />
      </div>
    );
  }

  return null;
}

/** Duplicate keycap behind (`z-0`), slight static offset — no separate deck div. */
function PreviewKeycap({
  pressed,
  prefersReducedMotion,
  className,
  children,
}: {
  pressed: boolean;
  prefersReducedMotion: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const keycapBase = cn(
    "inline-flex min-h-[22px] min-w-[1.375rem] items-center justify-center gap-0.5 rounded-[5px] border-x border-t border-zinc-400/50 bg-muted px-1 py-px font-mono text-[9px] font-semibold tabular-nums text-zinc-50 shadow-sm",
    className,
  );

  return (
    <span className="relative inline-flex justify-center overflow-visible pb-1 align-middle">
      <kbd
        aria-hidden
        className={cn(
          keycapBase,
          "pointer-events-none absolute left-1/2 top-0 z-0 -translate-x-1/2 translate-y-[2px]",
        )}
      >
        {children}
      </kbd>
      <span
        className={cn(
          "relative z-10 flex justify-center will-change-transform",
          !prefersReducedMotion &&
            "transition-[transform] duration-150 ease-in-out",
          !pressed && !prefersReducedMotion && "-translate-y-[2px]",
          pressed && !prefersReducedMotion && "translate-y-[2px]",
        )}
      >
        <kbd
          className={cn(
            keycapBase,
            "relative cursor-default",
            !prefersReducedMotion &&
              "transition-[border-color,background-image,color] duration-150 ease-in-out",
            pressed &&
              "border-sky-500/45 bg-gradient-to-b from-sky-600 to-sky-950 text-sky-100",
          )}
        >
          {children}
        </kbd>
      </span>
    </span>
  );
}

/** Rich preview when hovering a throw pin (land cluster expanded). */
function UtilityThrowPinHoverCardContent({
  lineup: L,
  mapSlug,
  mapDisplayName,
  mapBadgeImageUrl,
  hoverYouTubeSrc,
  hoverStorageSrc,
  prefersReducedMotion,
  previewKeys,
  hoverInteractionActive,
}: {
  lineup: UtilityClientLineup;
  mapSlug: string;
  mapDisplayName: string;
  mapBadgeImageUrl: string | null;
  hoverYouTubeSrc: string | null;
  hoverStorageSrc: string | null;
  prefersReducedMotion: boolean;
  previewKeys: UtilityLineupPreviewKeys;
  /** True while this pin's hover card is open (Radix). Used to defer heavy media & listeners. */
  hoverInteractionActive: boolean;
}) {
  const hasVideo = Boolean(hoverYouTubeSrc || hoverStorageSrc);
  const showNoPreviewPanel = !L.lineupImageUrl && !hasVideo;

  const [portalMounted, setPortalMounted] = React.useState(false);
  const [bigPreviewOpen, setBigPreviewOpen] = React.useState(false);
  const [ctrlHeldLocal, setCtrlHeldLocal] = React.useState(false);
  const [fullscreenZoomed, setFullscreenZoomed] = React.useState(true);
  const [fullscreenReticlesOn, setFullscreenReticlesOn] = React.useState(true);
  const [fullscreenInstantTiming, setFullscreenInstantTiming] =
    React.useState(false);

  const heavyMediaActive = hoverInteractionActive || bigPreviewOpen;
  const airTravelSec = formatUtilityLineupAirTravelSeconds(L);
  const precisionLevelUpper = L.margin?.trim()
    ? L.margin.replace(/_/g, " ").toUpperCase()
    : null;
  const isSmokeLineup = L.grenadeType.toLowerCase() === "smoke";
  /** Headline: icon (if smoke) + throw + undo + land, each one step in the chain. */
  const headlineStaggerSlotCount = isSmokeLineup ? 4 : 3;
  /** Slower LTR steps for the throw row labels. */
  const HOVER_STAGGER_HEADLINE_INC = 0.1;
  /** Quicker chain for technique → air → hints → verified (after headline + pause). */
  const HOVER_STAGGER_REST_INC = 0.05;
  /** Matches `slide-*-fade-in` duration in `@workspace/ui` globals (~0.3s). */
  const HOVER_STAGGER_SLIDE_DURATION_SEC = 0.3;
  const PAUSE_AFTER_HEADLINE_SEC = 0.14;
  const restChainBaseDelay =
    (headlineStaggerSlotCount - 1) * HOVER_STAGGER_HEADLINE_INC +
    HOVER_STAGGER_SLIDE_DURATION_SEC +
    PAUSE_AFTER_HEADLINE_SEC;
  const restVideoStaggerIndex = airTravelSec != null ? 2 : 1;
  const restVerifiedStaggerIndex = restVideoStaggerIndex + (hasVideo ? 1 : 0);

  React.useEffect(() => setPortalMounted(true), []);

  const bigPreviewWasOpenRef = React.useRef(false);
  React.useEffect(() => {
    const wasOpen = bigPreviewWasOpenRef.current;
    bigPreviewWasOpenRef.current = bigPreviewOpen;
    if (bigPreviewOpen && !wasOpen) {
      setFullscreenZoomed(true);
      setFullscreenReticlesOn(true);
      setFullscreenInstantTiming(false);
    }
  }, [bigPreviewOpen]);

  React.useEffect(() => {
    if (!hoverInteractionActive) {
      setCtrlHeldLocal(false);
      setBigPreviewOpen(false);
    }
  }, [hoverInteractionActive]);

  React.useEffect(() => {
    if (!hasVideo || !hoverInteractionActive) return;

    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key !== "Control") return;
      setCtrlHeldLocal(true);
      setBigPreviewOpen(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key !== "Control") return;
      setCtrlHeldLocal(false);
      setBigPreviewOpen(false);
    };
    const reset = () => {
      setCtrlHeldLocal(false);
      setBigPreviewOpen(false);
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
    };
  }, [hasVideo, hoverInteractionActive]);

  React.useEffect(() => {
    if (!bigPreviewOpen) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setBigPreviewOpen(false);
    };
    document.addEventListener("keydown", esc, true);
    return () => document.removeEventListener("keydown", esc, true);
  }, [bigPreviewOpen]);

  React.useEffect(() => {
    if (!bigPreviewOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [bigPreviewOpen]);

  React.useEffect(() => {
    if (!bigPreviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "z" && e.key !== "Z") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      setFullscreenInstantTiming(true);
      setFullscreenZoomed((z) => !z);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bigPreviewOpen]);

  return (
    <>
      <div className="flex max-h-[min(85vh,720px)] flex-col overflow-hidden md:max-h-[min(88vh,760px)]">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-sky-500/25 px-2.5 py-2 md:gap-3 md:px-6 md:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex items-center gap-1">
              {mapBadgeImageUrl ? (
                <Image
                  src={mapBadgeImageUrl}
                  alt=""
                  width={100}
                  height={100}
                  className="size-full object-contain pb-0.5 h-auto w-4"
                />
              ) : (
                <span
                  className="flex size-6 shrink-0 items-center justify-center text-[9px] font-bold uppercase tabular-nums text-zinc-500"
                  aria-hidden
                >
                  {mapSlug.slice(0, 2)}
                </span>
              )}
              <span className="min-w-0 truncate text-[11px] font-semibold leading-tight text-zinc-100 md:text-xs">
                {mapDisplayName}
              </span>
            </div>
            <Badge
              variant="secondary"
              className="shrink-0 px-1.5 py-0 text-[10px] font-medium capitalize"
            >
              {L.grenadeType}
            </Badge>
          </div>
          {L.uploadAuthorAlias ? (
            <div className="flex min-w-0 max-w-[45%] items-center justify-end gap-1.5 text-[10px] text-zinc-400">
              <Avatar className="size-4 shrink-0 border border-zinc-700">
                {L.uploadAuthorAvatarUrl ? (
                  <AvatarImage
                    src={L.uploadAuthorAvatarUrl}
                    alt=""
                    className="object-cover"
                  />
                ) : null}
                <AvatarFallback className="bg-zinc-800 text-[9px] font-medium text-zinc-300">
                  {L.uploadAuthorAlias.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate font-medium text-zinc-300">
                {L.uploadAuthorAlias}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex min-h-0 min-w-0 shrink-0 flex-col border-b border-sky-500/25">
          {L.lineupImageUrl ? (
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={L.lineupImageUrl}
                alt=""
                className="max-h-[min(32vh,260px)] w-full object-cover"
              />
            </div>
          ) : null}

          {hasVideo ? (
            <div
              className={
                L.lineupImageUrl
                  ? "min-h-0 flex-1 border-t border-sky-500/20"
                  : "min-h-0 flex-1"
              }
            >
              <ThrowPinHoverPreviewMedia
                lineup={L}
                hoverYouTubeSrc={hoverYouTubeSrc}
                hoverStorageSrc={hoverStorageSrc}
                prefersReducedMotion={prefersReducedMotion}
                previewKeys={previewKeys}
                heavyMediaActive={heavyMediaActive}
              />
            </div>
          ) : null}

          {showNoPreviewPanel ? (
            <div className="flex min-h-[120px] flex-1 items-center justify-center border-sky-500/20 bg-zinc-900/80 px-3 py-10 text-center text-xs text-zinc-500">
              No preview media for this lineup.
            </div>
          ) : null}
        </div>

        <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto p-3 md:p-6">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-2xl font-extrabold leading-snug text-zinc-50">
            {isSmokeLineup ? (
              <StaggeredAnimation
                index={0}
                chainFromZero
                baseDelay={0}
                incrementDelay={HOVER_STAGGER_HEADLINE_INC}
                fadeDirection="left"
                reducedMotion={prefersReducedMotion}
                className="inline-flex shrink-0 items-center"
              >
                <span className="flex shrink-0 items-center">
                  <LineupSmokeSideIcons
                    side={L.side}
                    grenadeType={L.grenadeType}
                  />
                </span>
              </StaggeredAnimation>
            ) : null}
            <StaggeredAnimation
              index={isSmokeLineup ? 1 : 0}
              chainFromZero
              baseDelay={0}
              incrementDelay={HOVER_STAGGER_HEADLINE_INC}
              fadeDirection="left"
              reducedMotion={prefersReducedMotion}
              className="inline-flex min-w-0 max-w-full items-baseline"
            >
              <p className="min-w-0">{L.throwLabel}</p>
            </StaggeredAnimation>
            <StaggeredAnimation
              index={isSmokeLineup ? 2 : 1}
              chainFromZero
              baseDelay={0}
              incrementDelay={HOVER_STAGGER_HEADLINE_INC}
              fadeDirection="left"
              reducedMotion={prefersReducedMotion}
              className="inline-flex shrink-0 items-center"
            >
              <Undo
                className="h-4 w-4 -scale-x-100 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </StaggeredAnimation>
            <StaggeredAnimation
              index={isSmokeLineup ? 3 : 2}
              chainFromZero
              baseDelay={0}
              incrementDelay={HOVER_STAGGER_HEADLINE_INC}
              fadeDirection="left"
              reducedMotion={prefersReducedMotion}
              className="inline-flex min-w-0 max-w-full items-baseline"
            >
              <p className="min-w-0">{L.landLabel}</p>
            </StaggeredAnimation>
          </div>
          <div className="mt-4 flex flex-col gap-2.5">
            <StaggeredAnimation
              index={0}
              chainFromZero
              baseDelay={restChainBaseDelay}
              incrementDelay={HOVER_STAGGER_REST_INC}
              fadeDirection="up"
              reducedMotion={prefersReducedMotion}
            >
              <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 uppercase text-sm font-bold text-zinc-400">
                {utilityLineupMovementTechniqueChainParts(L).map((part, i) => (
                  <React.Fragment key={`${L.id}-meta-${i}`}>
                    {i > 0 ? (
                      <span
                        className="inline-flex shrink-0 items-center justify-center px-0.5 font-semibold leading-none text-[9px] text-muted-foreground"
                        aria-hidden
                      >
                        +
                      </span>
                    ) : null}
                    <span>{part}</span>
                  </React.Fragment>
                ))}
              </div>
            </StaggeredAnimation>
            {airTravelSec != null ? (
              <StaggeredAnimation
                index={1}
                chainFromZero
                baseDelay={restChainBaseDelay}
                incrementDelay={HOVER_STAGGER_REST_INC}
                fadeDirection="up"
                reducedMotion={prefersReducedMotion}
              >
                <div
                  className="flex items-center gap-2"
                  title="Air travel time (release → bloom)"
                >
                  {precisionLevelUpper ? (
                    <>
                      <div className="flex items-center gap-1">
                        <Crosshair
                          className="h-2.5 w-2.5 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <span className="text-[0.625rem] font-semibold tracking-wide text-muted-foreground">
                          {precisionLevelUpper}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "h-0.5 w-0.5 shrink-0 rounded-full bg-muted-foreground",
                          !prefersReducedMotion && "animate-pulse",
                        )}
                        aria-hidden
                      />
                    </>
                  ) : null}
                  <div className="flex items-center gap-1">
                    <Plane
                      className="h-3 w-3 shrink-0 text-muted-foreground animate-slide-up-fade-in"
                      aria-hidden
                    />
                    <p className="text-[0.625rem] uppercase font-medium text-muted-foreground">
                      <CountUp
                        start={0}
                        end={Number(airTravelSec)}
                        duration={2.5}
                        separator=","
                        decimals={1}
                        delay={1}
                      />{" "}
                      seconds
                    </p>
                  </div>
                </div>
              </StaggeredAnimation>
            ) : null}
          </div>

          {hasVideo ? (
            <StaggeredAnimation
              index={restVideoStaggerIndex}
              chainFromZero
              baseDelay={restChainBaseDelay}
              incrementDelay={HOVER_STAGGER_REST_INC}
              fadeDirection="up"
              reducedMotion={prefersReducedMotion}
            >
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-zinc-800/80 pt-6">
                <div className="flex min-w-0 flex-col gap-4">
                  <div
                    className={cn(
                      "flex min-w-0 items-center gap-2 text-xs transition-colors duration-200",
                      previewKeys.lineupStill
                        ? "text-sky-400"
                        : "text-zinc-500",
                    )}
                  >
                    <PreviewKeycap
                      pressed={previewKeys.lineupStill}
                      prefersReducedMotion={prefersReducedMotion}
                      className="px-2"
                    >
                      Shift
                    </PreviewKeycap>
                    {/* <div
                    className={cn(
                      "h-0.5 w-0.5 shrink-0 rounded-full bg-muted",
                      previewKeys.lineupStill ? "bg-sky-400" : "bg-zinc-500",
                      previewKeys.lineupStill &&
                        !prefersReducedMotion &&
                        "animate-pulse",
                    )}
                  /> */}
                    <p
                      className={cn(
                        "min-w-0 pb-0.5 capitalize transition-all duration-150 ease-in-out",
                        previewKeys.lineupStill
                          ? "font-bold text-sky-400"
                          : "font-semibold text-zinc-500",
                      )}
                    >
                      lineup
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex min-w-0 items-center gap-2 text-xs transition-colors duration-200",
                      ctrlHeldLocal ? "text-sky-400" : "text-zinc-500",
                    )}
                  >
                    <PreviewKeycap
                      pressed={ctrlHeldLocal}
                      prefersReducedMotion={prefersReducedMotion}
                      className="px-2"
                    >
                      Ctrl
                    </PreviewKeycap>
                    {/* <div
                    className={cn(
                      "h-0.5 w-0.5 shrink-0 rounded-full bg-muted",
                      ctrlHeldLocal ? "bg-sky-400" : "bg-zinc-500",
                      ctrlHeldLocal && !prefersReducedMotion && "animate-pulse",
                    )}
                  /> */}
                    <p
                      className={cn(
                        "min-w-0 pb-0.5 transition-all duration-150 ease-in-out",
                        ctrlHeldLocal
                          ? "font-bold text-sky-400"
                          : "font-semibold text-zinc-500",
                      )}
                    >
                      Hold for fullscreen
                    </p>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-4">
                  <div
                    className={cn(
                      "flex min-w-0 items-center gap-2 text-xs transition-colors duration-200",
                      previewKeys.startStill ? "text-sky-400" : "text-zinc-500",
                    )}
                  >
                    <PreviewKeycap
                      pressed={previewKeys.startStill}
                      prefersReducedMotion={prefersReducedMotion}
                    >
                      A
                    </PreviewKeycap>
                    {/* <div
                    className={cn(
                      "h-0.5 w-0.5 shrink-0 rounded-full bg-muted",
                      previewKeys.startStill ? "bg-sky-400" : "bg-zinc-500",
                      previewKeys.startStill &&
                        !prefersReducedMotion &&
                        "animate-pulse",
                    )}
                  /> */}
                    <p
                      className={cn(
                        "min-w-0 pb-0.5 capitalize transition-all duration-150 ease-in-out",
                        previewKeys.startStill
                          ? "font-bold text-sky-400"
                          : "font-semibold text-zinc-500",
                      )}
                    >
                      starting position
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex min-w-0 items-center gap-2 text-xs transition-colors duration-200",
                      previewKeys.landStill ? "text-sky-400" : "text-zinc-500",
                    )}
                  >
                    <PreviewKeycap
                      pressed={previewKeys.landStill}
                      prefersReducedMotion={prefersReducedMotion}
                    >
                      D
                    </PreviewKeycap>
                    {/* <div
                    className={cn(
                      "h-0.5 w-0.5 shrink-0 rounded-full bg-muted",
                      previewKeys.landStill ? "bg-sky-400" : "bg-zinc-500",
                      previewKeys.landStill &&
                        !prefersReducedMotion &&
                        "animate-pulse",
                    )}
                  /> */}
                    <p
                      className={cn(
                        "min-w-0 pb-0.5 capitalize transition-all duration-150 ease-in-out",
                        previewKeys.landStill
                          ? "font-bold text-sky-400"
                          : "font-semibold text-zinc-500",
                      )}
                    >
                      landing position
                    </p>
                  </div>
                </div>
              </div>
            </StaggeredAnimation>
          ) : null}

          {L.intradarkVerified || L.proVerified ? (
            <StaggeredAnimation
              index={restVerifiedStaggerIndex}
              chainFromZero
              baseDelay={restChainBaseDelay}
              incrementDelay={HOVER_STAGGER_REST_INC}
              fadeDirection="up"
              reducedMotion={prefersReducedMotion}
            >
              <div className="border-t border-sky-500/15 pt-4">
                <div className="flex flex-col gap-2">
                  {L.intradarkVerified ? (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-sky-400">
                      <ShieldCheck
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden
                      />
                      <span>Intradark verified</span>
                    </div>
                  ) : null}
                  {L.proVerified ? (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400/95">
                      <ShieldCheck
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden
                      />
                      <span>Pro verified</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </StaggeredAnimation>
          ) : null}

          {/* <div className="border-t border-zinc-800 pt-2.5 text-right">
            <p className="text-xs text-zinc-500">View Details</p>
          </div> */}
        </div>
      </div>

      {portalMounted && bigPreviewOpen && hasVideo
        ? createPortal(
            <div
              className="fixed inset-0 z-[200]"
              role="dialog"
              aria-modal="true"
              aria-label={`Lineup preview: ${L.throwLabel} to ${L.landLabel}`}
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/85"
                onClick={() => setBigPreviewOpen(false)}
                aria-label="Close fullscreen preview"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-2 sm:p-4">
                <div className="pointer-events-auto relative w-full max-w-5xl overflow-hidden rounded-xl bg-black">
                  <ThrowPinHoverPreviewMedia
                    lineup={L}
                    hoverYouTubeSrc={hoverYouTubeSrc}
                    hoverStorageSrc={hoverStorageSrc}
                    prefersReducedMotion={prefersReducedMotion}
                    previewKeys={FULLSCREEN_LINEUP_PREVIEW_KEYS}
                    fullscreenLineup={{
                      zoomed: fullscreenZoomed,
                      reticlesOn: fullscreenReticlesOn,
                      instantTiming: fullscreenInstantTiming,
                    }}
                    frameClassName="mx-auto max-h-[min(92vh,900px)] w-full"
                    heavyMediaActive
                  />
                  <div className="absolute right-1.5 top-1.5 z-20 flex flex-wrap items-center justify-end gap-1 sm:right-2 sm:top-2 sm:gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 gap-1 border border-white/15 bg-zinc-950/90 px-2 text-xs text-zinc-100 shadow-lg backdrop-blur-sm hover:bg-zinc-900/95 sm:h-9 sm:px-2.5"
                      aria-pressed={fullscreenReticlesOn}
                      aria-label={
                        fullscreenReticlesOn
                          ? "Hide lineup reticle overlay"
                          : "Show lineup reticle overlay"
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullscreenReticlesOn((v) => !v);
                      }}
                    >
                      <Crosshair
                        className="size-3.5 shrink-0 sm:size-4"
                        aria-hidden
                      />
                      <span className="hidden sm:inline">Reticle</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 gap-1 border border-white/15 bg-zinc-950/90 px-2 text-xs text-zinc-100 shadow-lg backdrop-blur-sm hover:bg-zinc-900/95 sm:h-9 sm:px-2.5"
                      aria-pressed={fullscreenZoomed}
                      aria-label={
                        fullscreenZoomed
                          ? "Switch to normal size preview"
                          : "Switch to zoomed lineup preview"
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullscreenInstantTiming(true);
                        setFullscreenZoomed((z) => !z);
                      }}
                    >
                      <ZoomIn
                        className="size-3.5 shrink-0 sm:size-4"
                        aria-hidden
                      />
                      <span className="hidden min-[380px]:inline">Zoom</span>
                      <kbd className="ml-0.5 hidden font-mono text-[10px] text-zinc-400 sm:inline">
                        Z
                      </kbd>
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="size-8 border border-white/15 bg-zinc-950/90 text-zinc-100 shadow-lg backdrop-blur-sm hover:bg-zinc-900/95 sm:size-9"
                      aria-label="Close"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBigPreviewOpen(false);
                      }}
                    >
                      <X className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** Dotted line + throw pin — orange (T) vs blue (CT). `both` uses T styling. */
function utilityThrowAccent(side: string): {
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
function utilityTravelPulseStroke(side: string): string {
  if (side === "ct") return "rgba(165, 215, 254, 0.82)";
  return "rgba(254, 199, 154, 0.82)";
}

function usePrefersReducedMotion(): boolean {
  return React.useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** Zoom / reset — driven by `TransformWrapper` ref (toolbar sits beside filters, outside the wrapper). */
function UtilityMapZoomToolbar({
  transformRef,
}: {
  transformRef: React.RefObject<ReactZoomPanPinchContentRef | null>;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 min-w-8 px-2"
        onClick={() => transformRef.current?.zoomIn(0.15, 200)}
        aria-label="Zoom in"
      >
        +
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 min-w-8 px-2"
        onClick={() => transformRef.current?.zoomOut(0.15, 200)}
        aria-label="Zoom out"
      >
        −
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 px-2 text-xs"
        onClick={() => transformRef.current?.resetTransform(200)}
        aria-label="Reset pan and zoom"
      >
        Reset
      </Button>
    </div>
  );
}

export function UtilityMapRadarClient({
  mapSlug,
  displayName,
  mapBadgeImageUrl = null,
  radarImageUrl,
  clusters,
  lineupsById,
  canEditUtilitySpots,
  filters,
  children,
}: {
  mapSlug: string;
  displayName: string;
  /** Optional CS-style map badge image from the catalog (shown in pin hover header). */
  mapBadgeImageUrl?: string | null;
  radarImageUrl: string;
  clusters: UtilityClientCluster[];
  lineupsById: Record<string, UtilityClientLineup>;
  canEditUtilitySpots?: boolean;
  filters: { grenadeType: string; side: string };
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [activeLineupId, setActiveLineupId] = React.useState<string | null>(
    null,
  );
  const [sheetTitle, setSheetTitle] = React.useState("");
  const [selectedClusterKey, setSelectedClusterKey] = React.useState<
    string | null
  >(null);
  const transformRef = React.useRef<ReactZoomPanPinchContentRef | null>(null);

  const radarMapping = React.useMemo(
    () => radarNormMappingForMap(mapSlug),
    [mapSlug],
  );

  const toDisplay = React.useCallback(
    (nx: number, ny: number) =>
      mapStoredRadarNormToDisplay(nx, ny, radarMapping),
    [radarMapping],
  );

  const radarImgRef = React.useRef<HTMLImageElement | null>(null);
  const { layout: radarLayout, recompute: recomputeRadarLayout } =
    useRadarImgLayout(radarImgRef);

  const overlayPinStyle = React.useCallback(
    (storedNx: number, storedNy: number) => {
      const d = toDisplay(storedNx, storedNy);
      if (!radarLayout) {
        return { left: `${d.x * 100}%`, top: `${d.y * 100}%` };
      }
      const { leftPct, topPct } = displayNormToOverlayPercent(
        radarLayout,
        d.x,
        d.y,
      );
      return { left: `${leftPct}%`, top: `${topPct}%` };
    },
    [toDisplay, radarLayout],
  );

  const overlaySvgPoint = React.useCallback(
    (storedNx: number, storedNy: number) => {
      const d = toDisplay(storedNx, storedNy);
      if (!radarLayout) {
        return { x: d.x * 100, y: d.y * 100 };
      }
      return displayNormToSvgPercent(radarLayout, d.x, d.y);
    },
    [toDisplay, radarLayout],
  );

  React.useEffect(() => {
    setSelectedClusterKey(null);
    setActiveHoverPinLineupId(null);
  }, [clusters, mapSlug, filters.grenadeType, filters.side]);

  const selectedCluster = React.useMemo(
    () =>
      selectedClusterKey
        ? (clusters.find((c) => c.clusterKey === selectedClusterKey) ?? null)
        : null,
    [clusters, selectedClusterKey],
  );

  const hasExpandedLand = selectedClusterKey !== null;

  const prefersReducedMotion = usePrefersReducedMotion();

  const lineupPreviewKeys = useUtilityLineupPreviewKeys();
  const [activeHoverPinLineupId, setActiveHoverPinLineupId] = React.useState<
    string | null
  >(null);

  const toggleLandCluster = React.useCallback(
    (cluster: UtilityClientCluster) => {
      setSelectedClusterKey((prev) =>
        prev === cluster.clusterKey ? null : cluster.clusterKey,
      );
    },
    [],
  );

  const openLineupFromThrow = React.useCallback(
    (lineupId: string) => {
      const row = lineupsById[lineupId];
      if (!row) return;
      setActiveLineupId(lineupId);
      setSheetTitle(`${row.throwLabel} → ${row.landLabel}`);
      setOpen(true);
      void track("utility_lineup_open", {
        map_slug: mapSlug,
        lineup_id: lineupId,
        grenade_type: filters.grenadeType,
        side: filters.side,
      });
    },
    [filters.grenadeType, filters.side, lineupsById, mapSlug],
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedClusterKey(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="utility-map-container bg-background relative w-full min-w-0 overflow-hidden rounded-lg">
        <div className="flex w-full min-w-0 flex-col gap-3">
          <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
            {children ? (
              <div className="flex min-w-0 min-h-0 flex-1 items-center justify-start">
                {children}
              </div>
            ) : (
              <div className="min-w-0 flex-1" aria-hidden />
            )}
            <div className="ml-auto flex shrink-0 items-center">
              <UtilityMapZoomToolbar transformRef={transformRef} />
            </div>
          </div>
          <div className="mx-auto w-full min-w-0 max-w-[720px]">
            <TransformWrapper
              ref={transformRef}
              initialScale={MAP_BASE_SCALE}
              minScale={MAP_BASE_SCALE}
              maxScale={6}
              limitToBounds
              centerZoomedOut
              centerOnInit
              wheel={{ step: 0.02 }}
              panning={{ velocityDisabled: false }}
              pinch={{ disabled: false }}
              doubleClick={{ mode: "toggle", step: 0.65 }}
            >
              {/*
              react-zoom-pan-pinch defaults .wrapper/.content to width/height: fit-content, which
              collapses flex layout — force fill + min-h-0 so the radar gets real dimensions.
            */}
              <div className="flex h-[min(70vh,720px)] max-h-[min(70vh,720px)] min-h-[280px] w-full flex-col">
                <TransformComponent
                  wrapperClass="!flex min-h-0 !w-full flex-1 flex-col items-stretch justify-stretch overflow-hidden !p-1 md:!p-2"
                  wrapperStyle={{ flex: "1 1 0%", minHeight: 0 }}
                  contentClass="!flex !h-full !w-full !max-w-full items-center justify-center"
                  contentStyle={{
                    width: "100%",
                    height: "100%",
                    minHeight: 0,
                    minWidth: 0,
                    maxWidth: "100%",
                  }}
                >
                  {/*
                  Percent coords must be relative to the rendered img box, not the transform viewport.
                  The img is h-auto inside a tall flex area — anchoring overlays to a wrapper that is
                  only as tall as the image keeps radarY / radarX aligned with the artwork.
                */}
                  <div className="flex h-full min-h-0 w-full max-w-full flex-col justify-center">
                    <div className="relative w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary HTTPS radar URLs */}
                      <img
                        ref={radarImgRef}
                        src={radarImageUrl}
                        alt={`${displayName} radar`}
                        className="pointer-events-none block h-auto w-full max-h-[min(62vh,640px)] object-contain select-none"
                        draggable={false}
                        onLoad={() => {
                          recomputeRadarLayout();
                        }}
                      />

                      {hasExpandedLand ? (
                        <button
                          type="button"
                          aria-label="Dismiss throw paths"
                          tabIndex={-1}
                          className="absolute inset-0 z-[7] cursor-default border-0 bg-transparent p-0 focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setSelectedClusterKey(null)}
                        />
                      ) : null}

                      {selectedCluster ? (
                        <div
                          className="pointer-events-none absolute inset-0 z-[8]"
                          aria-hidden
                        >
                          <svg
                            className="absolute inset-0 h-full w-full"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                          >
                            <defs>
                              <style>
                                {`
                                @keyframes intradarkUtilityDashTravel {
                                  to {
                                    stroke-dashoffset: -2.2;
                                  }
                                }
                                .intradark-utility-throw-line {
                                  stroke-dashoffset: 0;
                                  animation: intradarkUtilityDashTravel 1.15s linear infinite;
                                }
                                @media (prefers-reduced-motion: reduce) {
                                  .intradark-utility-throw-line {
                                    animation: none;
                                  }
                                }
                              `}
                              </style>
                            </defs>
                            {selectedCluster.lineupIds.map((id) => {
                              const L = lineupsById[id];
                              if (!L) return null;
                              const from = overlaySvgPoint(
                                L.throwSpotX,
                                L.throwSpotY,
                              );
                              const to = overlaySvgPoint(
                                selectedCluster.radarX,
                                selectedCluster.radarY,
                              );
                              const accent = utilityThrowAccent(L.side);
                              const x1 = from.x;
                              const y1 = from.y;
                              const x2 = to.x;
                              const y2 = to.y;
                              const segLen =
                                Math.hypot(x2 - x1, y2 - y1) || 0.01;
                              const pulseLen = Math.max(1.6, segLen * 0.13);
                              const gapLen = segLen * 2.75;
                              const travelPeriod = pulseLen + gapLen;
                              return (
                                <g key={`throw-line-${id}`}>
                                  <line
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    stroke={utilityTravelPulseStroke(L.side)}
                                    strokeWidth={0.58}
                                    strokeDasharray={`${pulseLen} ${gapLen}`}
                                    strokeDashoffset={0}
                                    strokeLinecap="round"
                                    opacity={0.92}
                                  >
                                    {!prefersReducedMotion ? (
                                      <animate
                                        attributeName="stroke-dashoffset"
                                        from="0"
                                        to={String(-travelPeriod)}
                                        dur="2.25s"
                                        repeatCount="indefinite"
                                      />
                                    ) : null}
                                  </line>
                                  <line
                                    className="intradark-utility-throw-line"
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    stroke={accent.stroke}
                                    strokeWidth={0.35}
                                    strokeDasharray="1.2 1"
                                    strokeLinecap="round"
                                    opacity={0.88}
                                  />
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      ) : null}

                      {selectedCluster
                        ? selectedCluster.lineupIds.map((id, idx) => {
                            const L = lineupsById[id];
                            if (!L) return null;
                            const pinPos = overlayPinStyle(
                              L.throwSpotX,
                              L.throwSpotY,
                            );
                            const accent = utilityThrowAccent(L.side);
                            const hoverYouTubeSrc = prefersReducedMotion
                              ? buildYouTubeEmbedSrc(
                                  L.youtubeUrl,
                                  L.videoStartMs,
                                  L.videoEndMs,
                                )
                              : buildYouTubeEmbedHoverPreviewSrc(
                                  L.youtubeUrl,
                                  L.videoStartMs,
                                  L.videoEndMs,
                                );
                            const hoverStorageSrc = L.videoObjectPath
                              ? intradarkMediaPublicUrl(L.videoObjectPath)
                              : null;
                            return (
                              <HoverCard
                                key={`throw-pin-${id}`}
                                openDelay={280}
                                closeDelay={120}
                                onOpenChange={(open) => {
                                  setActiveHoverPinLineupId((prev) => {
                                    if (open) return id;
                                    if (prev === id) return null;
                                    return prev;
                                  });
                                }}
                              >
                                <HoverCardTrigger asChild>
                                  <button
                                    type="button"
                                    className={`border-background absolute z-[11] flex min-h-6 min-w-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer touch-manipulation items-center justify-center rounded-full border-2 text-[10px] font-semibold shadow-md transition ${accent.pinClasses}`}
                                    style={{
                                      left: pinPos.left,
                                      top: pinPos.top,
                                    }}
                                    // title={L.throwLabel}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openLineupFromThrow(id);
                                    }}
                                    aria-label={`Throw ${idx + 1} from ${L.throwLabel}`}
                                  >
                                    {idx + 1}
                                  </button>
                                </HoverCardTrigger>
                                <HoverCardContent
                                  className="z-[80] w-[min(52vw,420px)] overflow-hidden border border-sky-500/35 bg-zinc-950 p-0 text-zinc-100 shadow-xl"
                                  side="right"
                                  align="center"
                                  sideOffset={10}
                                  onPointerDown={(e) => e.stopPropagation()}
                                >
                                  <UtilityThrowPinHoverCardContent
                                    lineup={L}
                                    mapSlug={mapSlug}
                                    mapDisplayName={displayName}
                                    mapBadgeImageUrl={mapBadgeImageUrl}
                                    hoverYouTubeSrc={hoverYouTubeSrc}
                                    hoverStorageSrc={hoverStorageSrc}
                                    prefersReducedMotion={prefersReducedMotion}
                                    previewKeys={lineupPreviewKeys}
                                    hoverInteractionActive={
                                      activeHoverPinLineupId === id
                                    }
                                  />
                                </HoverCardContent>
                              </HoverCard>
                            );
                          })
                        : null}

                      {clusters.map((c) => {
                        const isSelected = selectedClusterKey === c.clusterKey;
                        const landPin = overlayPinStyle(c.radarX, c.radarY);
                        const landIconSrc = landSmokeIconForCluster(
                          c,
                          lineupsById,
                        );
                        const landOpacityClass = hasExpandedLand
                          ? isSelected
                            ? "opacity-100"
                            : "pointer-events-none opacity-0"
                          : "opacity-50 hover:opacity-100";
                        return (
                          <button
                            key={c.clusterKey}
                            type="button"
                            className={`group absolute z-[12] flex -translate-x-1/2 -translate-y-1/2 cursor-pointer touch-manipulation items-center justify-center rounded-full border-0 bg-transparent p-0 shadow-none transition-opacity duration-300 ease-out ${landOpacityClass}`}
                            style={{
                              left: landPin.left,
                              top: landPin.top,
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLandCluster(c);
                            }}
                            aria-expanded={isSelected}
                            aria-label={`${c.label}, ${c.count} lineup${c.count === 1 ? "" : "s"} at land — ${isSelected ? "hide throw positions" : "show throw positions"}`}
                          >
                            <span className="relative inline-flex h-8 w-8 items-center justify-center">
                              <span
                                className={`pointer-events-none inline-flex h-8 w-8 items-center justify-center transition-[filter] duration-300 motion-reduce:animate-none ${
                                  isSelected
                                    ? "animate-[spin_14s_linear_infinite] [filter:drop-shadow(0_0_1px_rgba(255_255_255/0.35))_drop-shadow(0_0_3px_rgba(255_255_255/0.2))]"
                                    : "motion-reduce:group-hover:animate-none group-hover:animate-[spin_14s_linear_infinite] group-hover:[filter:drop-shadow(0_0_1px_rgba(255_255_255/0.35))_drop-shadow(0_0_3px_rgba(255_255_255/0.2))]"
                                }`}
                                aria-hidden
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element -- local static asset */}
                                <img
                                  src={landIconSrc}
                                  alt=""
                                  width={32}
                                  height={32}
                                  className="pointer-events-none h-8 w-8 select-none"
                                  draggable={false}
                                />
                              </span>
                              {c.count > 1 ? (
                                <span
                                  className="pointer-events-none absolute inset-0 flex items-center justify-center text-[15px] font-black tabular-nums leading-none tracking-tight text-zinc-950 drop-shadow-[0_0_2px_rgb(255_255_255),0_0_4px_rgb(255_255_255),0_1px_2px_rgb(0_0_0/0.5)]"
                                  aria-hidden
                                >
                                  {c.count}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </TransformComponent>
              </div>
            </TransformWrapper>
          </div>
        </div>
      </div>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setActiveLineupId(null);
        }}
      >
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-border shrink-0 border-b p-4 text-left">
            <SheetTitle>{sheetTitle}</SheetTitle>
            <SheetDescription className="sr-only">
              Lineup details for {displayName}
            </SheetDescription>
          </SheetHeader>
          <div className="flex max-h-[calc(100vh-5rem)] flex-col gap-4 overflow-y-auto p-4">
            {activeLineupId && lineupsById[activeLineupId] ? (
              <LineupDetailCard
                lineup={lineupsById[activeLineupId]}
                mapSlug={mapSlug}
                radarImageUrl={radarImageUrl}
                displayName={displayName}
                canEditSpots={Boolean(canEditUtilitySpots)}
                onSpotsSaved={() => {
                  void router.refresh();
                }}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function lineupToTimelineValues(
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

function AdminTimelineEditBlock({
  lineup,
  mapSlug,
  onCancel,
  onSaved,
}: {
  lineup: UtilityClientLineup;
  mapSlug: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const videoSrc = lineup.videoObjectPath
    ? intradarkMediaPublicUrl(lineup.videoObjectPath)
    : null;
  const [timeline, setTimeline] =
    React.useState<UtilityLineupTimelineScrubberValues>(() =>
      lineupToTimelineValues(lineup),
    );
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTimeline(lineupToTimelineValues(lineup));
    setErr(null);
  }, [
    lineup.id,
    lineup.videoStartMs,
    lineup.videoEndMs,
    lineup.stillStandMs,
    lineup.stillThrowMs,
    lineup.stillLandMs,
    lineup.grenadeReleaseMs,
    lineup.grenadeBloomMs,
  ]);

  async function save() {
    setSaving(true);
    setErr(null);
    const res = await updateUtilityLineupTimelineAction({
      lineupId: lineup.id,
      mapSlug,
      ...timeline,
    });
    setSaving(false);
    if (!res.ok) {
      setErr(res.message);
      return;
    }
    onSaved();
  }

  if (!videoSrc) {
    return (
      <div className="border-border space-y-2 border-t pt-3">
        <p className="text-muted-foreground text-xs">
          Timeline editing needs a storage-hosted video (not YouTube-only).
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="border-border space-y-3 border-t pt-3">
      <p className="text-sm font-medium">
        Edit playback trim & timeline markers
      </p>
      {err ? <p className="text-destructive text-sm">{err}</p> : null}
      <UtilityLineupVideoTimelineScrubber
        videoSrc={videoSrc}
        values={timeline}
        setTimeline={setTimeline}
        disabled={saving}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void save()}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save timeline"}
        </Button>
      </div>
    </div>
  );
}

function AdminSpotEditBlock({
  lineup,
  mapSlug,
  radarImageUrl,
  displayName,
  onCancel,
  onSaved,
}: {
  lineup: UtilityClientLineup;
  mapSlug: string;
  radarImageUrl: string;
  displayName: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const mapping = React.useMemo(
    () => radarNormMappingForMap(mapSlug),
    [mapSlug],
  );
  const radarImgRef = React.useRef<HTMLImageElement | null>(null);
  const { layout: radarLayout, recompute: recomputeRadarLayout } =
    useRadarImgLayout(radarImgRef);
  const [pinPhase, setPinPhase] = React.useState<"throw" | "land">("throw");
  const [throwNorm, setThrowNorm] = React.useState({
    x: lineup.throwSpotX,
    y: lineup.throwSpotY,
  });
  const [landNorm, setLandNorm] = React.useState({
    x: lineup.landSpotX,
    y: lineup.landSpotY,
  });
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    setThrowNorm({ x: lineup.throwSpotX, y: lineup.throwSpotY });
    setLandNorm({ x: lineup.landSpotX, y: lineup.landSpotY });
    setPinPhase("throw");
    setErr(null);
  }, [
    lineup.id,
    lineup.throwSpotX,
    lineup.throwSpotY,
    lineup.landSpotX,
    lineup.landSpotY,
  ]);

  const onRadarClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const img = radarImgRef.current;
      let dx: number;
      let dy: number;
      if (img?.naturalWidth) {
        const pt = clientPointToDisplayNormInObjectContain(
          img,
          e.clientX,
          e.clientY,
        );
        if (!pt) return;
        dx = pt.x;
        dy = pt.y;
      } else {
        const rect = (
          e.currentTarget as HTMLDivElement
        ).getBoundingClientRect();
        dx = (e.clientX - rect.left) / rect.width;
        dy = (e.clientY - rect.top) / rect.height;
      }
      const stored = mapDisplayRadarNormToStored(dx, dy, mapping);
      if (pinPhase === "throw") {
        setThrowNorm(stored);
      } else {
        setLandNorm(stored);
      }
    },
    [mapping, pinPhase],
  );

  const throwDisp = mapStoredRadarNormToDisplay(
    throwNorm.x,
    throwNorm.y,
    mapping,
  );
  const landDisp = mapStoredRadarNormToDisplay(landNorm.x, landNorm.y, mapping);

  async function save() {
    setSaving(true);
    setErr(null);
    const res = await updateUtilityLineupSpotsAction({
      lineupId: lineup.id,
      mapSlug,
      throwSpotX: throwNorm.x,
      throwSpotY: throwNorm.y,
      landSpotX: landNorm.x,
      landSpotY: landNorm.y,
    });
    setSaving(false);
    if (!res.ok) {
      setErr(res.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="border-border space-y-3 border-t pt-3">
      <p className="text-sm font-medium">Adjust positions on radar</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={pinPhase === "throw" ? "default" : "outline"}
          onClick={() => setPinPhase("throw")}
        >
          Place throw
        </Button>
        <Button
          type="button"
          size="sm"
          variant={pinPhase === "land" ? "default" : "outline"}
          onClick={() => setPinPhase("land")}
        >
          Place land
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Click the map to set the{" "}
        {pinPhase === "throw" ? (
          <span className="text-orange-600 dark:text-orange-400">throw</span>
        ) : (
          <span className="text-sky-600 dark:text-sky-400">land</span>
        )}{" "}
        pin (same fit as the main viewer).
      </p>
      {err ? <p className="text-destructive text-sm">{err}</p> : null}
      <div className="space-y-2">
        <div
          role="presentation"
          aria-label="Radar — click to set throw or land position"
          className="relative w-full cursor-crosshair overflow-hidden rounded-md border border-border"
          onClick={onRadarClick}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={radarImgRef}
            src={radarImageUrl}
            alt={`${displayName} radar`}
            className="pointer-events-none block h-auto w-full max-h-[min(40vh,360px)] object-contain"
            draggable={false}
            onLoad={() => {
              recomputeRadarLayout();
            }}
          />
          <span
            className="border-background absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-orange-400 shadow"
            style={(() => {
              if (!radarLayout) {
                return {
                  left: `${throwDisp.x * 100}%`,
                  top: `${throwDisp.y * 100}%`,
                };
              }
              const { leftPct, topPct } = displayNormToOverlayPercent(
                radarLayout,
                throwDisp.x,
                throwDisp.y,
              );
              return { left: `${leftPct}%`, top: `${topPct}%` };
            })()}
            title="Throw"
          />
          <span
            className="border-background absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-sky-400 shadow"
            style={(() => {
              if (!radarLayout) {
                return {
                  left: `${landDisp.x * 100}%`,
                  top: `${landDisp.y * 100}%`,
                };
              }
              const { leftPct, topPct } = displayNormToOverlayPercent(
                radarLayout,
                landDisp.x,
                landDisp.y,
              );
              return { left: `${leftPct}%`, top: `${topPct}%` };
            })()}
            title="Land"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void save()}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save positions"}
        </Button>
      </div>
    </div>
  );
}

/** Avoids blank `<video>` frames when a transformed ancestor (e.g. Sheet) composites in Chrome. */
function StorageLineupVideo({
  src,
  startMs,
  endMs,
}: {
  src: string;
  startMs: number;
  endMs: number | null;
}) {
  const ref = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const applyStart = () => {
      if (startMs > 0) {
        v.currentTime = startMs / 1000;
      }
    };

    const onTime = () => {
      if (endMs != null && endMs > startMs) {
        const endS = endMs / 1000;
        if (v.currentTime > endS) {
          v.currentTime = endS;
          v.pause();
        }
      }
    };

    v.addEventListener("loadedmetadata", applyStart);
    v.addEventListener("timeupdate", onTime);
    return () => {
      v.removeEventListener("loadedmetadata", applyStart);
      v.removeEventListener("timeupdate", onTime);
    };
  }, [src, startMs, endMs]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-md border border-border [transform:translateZ(0)]">
      <video
        ref={ref}
        key={src}
        title="Lineup video"
        src={src}
        className="h-full w-full object-contain [transform:translateZ(0)]"
        controls
        playsInline
        preload="auto"
      />
    </div>
  );
}

function LineupDetailCard({
  lineup,
  mapSlug,
  radarImageUrl,
  displayName,
  canEditSpots,
  onSpotsSaved,
}: {
  lineup: UtilityClientLineup;
  mapSlug: string;
  radarImageUrl: string;
  displayName: string;
  canEditSpots: boolean;
  onSpotsSaved: () => void;
}) {
  const [editSpotsOpen, setEditSpotsOpen] = React.useState(false);
  const [editTimelineOpen, setEditTimelineOpen] = React.useState(false);

  React.useEffect(() => {
    setEditSpotsOpen(false);
    setEditTimelineOpen(false);
  }, [lineup.id]);

  const embedSrc = buildYouTubeEmbedSrc(
    lineup.youtubeUrl,
    lineup.videoStartMs,
    lineup.videoEndMs,
  );
  const storageVideoSrc = lineup.videoObjectPath
    ? intradarkMediaPublicUrl(lineup.videoObjectPath)
    : null;

  return (
    <article className="border-border space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{lineup.grenadeType}</Badge>
        <Badge variant="outline">{lineup.side}</Badge>
        {lineup.intradarkVerified ? (
          <Badge variant="default">Intradark</Badge>
        ) : null}
        {lineup.proVerified ? <Badge variant="default">Pro</Badge> : null}
      </div>
      <p className="text-muted-foreground text-xs">
        From <span className="text-foreground">{lineup.throwLabel}</span> →{" "}
        <span className="text-foreground">{lineup.landLabel}</span>
      </p>
      {canEditSpots ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditSpotsOpen((o) => !o)}
          >
            {editSpotsOpen ? "Close position editor" : "Edit throw & land"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditTimelineOpen((o) => !o)}
          >
            {editTimelineOpen ? "Close timeline editor" : "Edit timeline"}
          </Button>
        </div>
      ) : null}
      {editTimelineOpen && canEditSpots ? (
        <AdminTimelineEditBlock
          lineup={lineup}
          mapSlug={mapSlug}
          onCancel={() => setEditTimelineOpen(false)}
          onSaved={() => {
            setEditTimelineOpen(false);
            onSpotsSaved();
          }}
        />
      ) : null}
      {editSpotsOpen && canEditSpots ? (
        <AdminSpotEditBlock
          lineup={lineup}
          mapSlug={mapSlug}
          radarImageUrl={radarImageUrl}
          displayName={displayName}
          onCancel={() => setEditSpotsOpen(false)}
          onSaved={() => {
            setEditSpotsOpen(false);
            onSpotsSaved();
          }}
        />
      ) : null}
      {(lineup.stillStandMs != null ||
        lineup.stillThrowMs != null ||
        lineup.stillLandMs != null ||
        lineup.grenadeReleaseMs != null ||
        lineup.grenadeBloomMs != null) && (
        <dl className="text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-1 border-t border-border pt-2 text-[10px]">
          {lineup.stillStandMs != null ? (
            <>
              <dt>Stand still</dt>
              <dd className="font-mono text-foreground">
                {(lineup.stillStandMs / 1000).toFixed(1)}s
              </dd>
            </>
          ) : null}
          {lineup.stillThrowMs != null ? (
            <>
              <dt>Throw still</dt>
              <dd className="font-mono text-foreground">
                {(lineup.stillThrowMs / 1000).toFixed(1)}s
              </dd>
            </>
          ) : null}
          {lineup.stillLandMs != null ? (
            <>
              <dt>Land still</dt>
              <dd className="font-mono text-foreground">
                {(lineup.stillLandMs / 1000).toFixed(1)}s
              </dd>
            </>
          ) : null}
          {lineup.grenadeReleaseMs != null ? (
            <>
              <dt>Released</dt>
              <dd className="font-mono text-foreground">
                {(lineup.grenadeReleaseMs / 1000).toFixed(1)}s
              </dd>
            </>
          ) : null}
          {lineup.grenadeBloomMs != null ? (
            <>
              <dt>Blooms</dt>
              <dd className="font-mono text-foreground">
                {(lineup.grenadeBloomMs / 1000).toFixed(1)}s
              </dd>
            </>
          ) : null}
        </dl>
      )}
      <p className="text-sm whitespace-pre-wrap">{lineup.description}</p>
      {lineup.setposText ? (
        <pre className="bg-muted max-h-24 overflow-x-auto rounded-md p-2 text-xs">
          {lineup.setposText}
        </pre>
      ) : null}
      {lineup.lineupImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={lineup.lineupImageUrl}
          alt="Lineup reference"
          className="w-full rounded-md border border-border"
        />
      ) : null}
      {embedSrc ? (
        <div className="aspect-video w-full overflow-hidden rounded-md border border-border">
          <iframe
            title="Lineup video"
            src={embedSrc}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : storageVideoSrc ? (
        <StorageLineupVideo
          src={storageVideoSrc}
          startMs={lineup.videoStartMs}
          endMs={lineup.videoEndMs}
        />
      ) : (
        <p className="text-muted-foreground text-sm">
          No video for this lineup.
        </p>
      )}
      {lineup.youtubeUrl ? (
        <Button variant="link" className="h-auto px-0" asChild>
          <a href={lineup.youtubeUrl} target="_blank" rel="noopener noreferrer">
            Open on YouTube
          </a>
        </Button>
      ) : null}
    </article>
  );
}
