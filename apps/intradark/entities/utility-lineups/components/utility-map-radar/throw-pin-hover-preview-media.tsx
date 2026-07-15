"use client";

import * as React from "react";
import Image from "next/image";

import { cn } from "@workspace/ui/lib/utils";

import {
  resolveActiveStillPreviewTab,
  resolveStillPreviewMs,
  type StillPreviewTab,
} from "@/entities/utility-lineups/lib/utility-lineup-still-preview-ms";
import {
  type UtilityLineupPreviewKeys,
} from "@/entities/utility-lineups/lib/use-shift-held";
import {
  buildYouTubeEmbedHoverPreviewSrc,
  buildYouTubeEmbedPausedPreviewSrc,
  buildYouTubeEmbedSrc,
} from "@/entities/utility-lineups/lib/youtube-embed";

import { clampUtilityPreviewVideoTimeSec } from "./lib";
import { ShiftHoldStillZoom } from "./shift-hold-still-zoom";
import type { UtilityClientLineup } from "./types";

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

export function ThrowPinHoverPreviewMedia({
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
