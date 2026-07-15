"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Crosshair, Plane, ShieldCheck, Undo, X, ZoomIn } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import {
  type UtilityLineupPreviewKeys,
} from "@/entities/utility-lineups/lib/use-shift-held";
import {
  utilityLineupMovementTechniqueChainParts,
} from "@/entities/utility-lineups/lib/utility-lineup-throw-meta-labels";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import CountUp from "react-countup";

import {
  FULLSCREEN_LINEUP_PREVIEW_KEYS,
  formatUtilityLineupAirTravelSeconds,
} from "./lib";
import { ThrowPinHoverPreviewMedia } from "./throw-pin-hover-preview-media";
import { PreviewKeycap } from "./preview-keycap";
import type { UtilityClientLineup } from "./types";

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

/** Rich preview when hovering a throw pin (land cluster expanded). */
export function UtilityThrowPinHoverCardContent({
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
