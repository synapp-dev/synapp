"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics/react";
import {
  type ReactZoomPanPinchContentRef,
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";

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
  mapStoredRadarNormToDisplay,
  radarNormMappingForMap,
} from "@/entities/utility-lineups/lib/radar-display-mapping";
import {
  displayNormToOverlayPercent,
  displayNormToSvgPercent,
} from "@/entities/utility-lineups/lib/radar-object-contain-layout";
import { useRadarImgLayout } from "@/entities/utility-lineups/lib/use-radar-img-layout";
import { useUtilityLineupPreviewKeys } from "@/entities/utility-lineups/lib/use-shift-held";
import {
  buildYouTubeEmbedHoverPreviewSrc,
  buildYouTubeEmbedSrc,
} from "@/entities/utility-lineups/lib/youtube-embed";
import { intradarkMediaPublicUrl } from "@/lib/media/public-media-url";

import {
  landSmokeIconForCluster,
  utilityThrowAccent,
  utilityTravelPulseStroke,
} from "./utility-map-radar/lib";
import { LineupDetailCard } from "./utility-map-radar/lineup-detail-card";
import { UtilityThrowPinHoverCardContent } from "./utility-map-radar/throw-pin-hover-card";
import type {
  UtilityClientCluster,
  UtilityClientLineup,
} from "./utility-map-radar/types";
import { usePrefersReducedMotion } from "./utility-map-radar/use-prefers-reduced-motion";
import { UtilityMapZoomToolbar } from "./utility-map-radar/zoom-toolbar";

export type { UtilityClientCluster, UtilityClientLineup };

/** Matches `initialScale` / reset — users cannot zoom out past the default framing. */
const MAP_BASE_SCALE = 1;

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
        <SheetContent
          side="bottom"
          className="mx-auto h-[90vh] max-h-[90vh] w-full gap-0 rounded-t-xl p-0 sm:max-w-2xl"
        >
          <SheetHeader className="border-border shrink-0 border-b p-4 text-left">
            <SheetTitle>{sheetTitle}</SheetTitle>
            <SheetDescription className="sr-only">
              Lineup details for {displayName}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
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
