"use client";

import * as React from "react";

import { Button } from "@workspace/ui/components/button";

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
} from "@/entities/utility-lineups/lib/radar-object-contain-layout";
import { useRadarImgLayout } from "@/entities/utility-lineups/lib/use-radar-img-layout";
import { intradarkMediaPublicUrl } from "@/lib/media/public-media-url";
import {
  UtilityLineupVideoTimelineScrubber,
  type UtilityLineupTimelineScrubberValues,
} from "@/entities/utility-lineups/components/utility-lineup-video-timeline-scrubber";

import { lineupToTimelineValues } from "./lib";
import type { UtilityClientLineup } from "./types";

export function AdminTimelineEditBlock({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the saved primitive fields on purpose; depending on the `lineup` object identity would reset in-progress edits every render
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

export function AdminSpotEditBlock({
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
