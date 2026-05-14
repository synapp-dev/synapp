"use client";

import * as React from "react";
import type { Dispatch, SetStateAction } from "react";

import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";

import {
  UTILITY_LINEUP_MS_STEP,
  snapUtilityLineupMs,
} from "@/entities/utility-lineups/lib/utility-lineup-ms-step";

const BUMP_MS_FINE = 100;
const BUMP_MS_COARSE = 500;

export type UtilityLineupTimelineScrubberValues = {
  videoStartMs: number;
  videoEndMs: number | null;
  stillStandMs: number | null;
  stillThrowMs: number | null;
  stillLandMs: number | null;
  grenadeReleaseMs: number | null;
  grenadeBloomMs: number | null;
};

type MarkerChoice = {
  key: keyof UtilityLineupTimelineScrubberValues;
  label: string;
  optional: boolean;
};

const MARKERS: MarkerChoice[] = [
  { key: "videoStartMs", label: "Playback trim start", optional: false },
  { key: "videoEndMs", label: "Playback trim end", optional: true },
  { key: "stillStandMs", label: "Still — where to stand", optional: true },
  { key: "stillThrowMs", label: "Still — throw POV", optional: true },
  { key: "stillLandMs", label: "Still — land / bloom", optional: true },
  { key: "grenadeReleaseMs", label: "Grenade released", optional: true },
  { key: "grenadeBloomMs", label: "Grenade blooms", optional: true },
];

export function sliderMsForMarker(
  key: keyof UtilityLineupTimelineScrubberValues,
  values: UtilityLineupTimelineScrubberValues,
  durationMs: number,
): number {
  const raw = values[key];
  if (typeof raw === "number") return snapUtilityLineupMs(raw);
  if (key === "videoEndMs" && durationMs > 0) return snapUtilityLineupMs(durationMs);
  return 0;
}

export function UtilityLineupVideoTimelineScrubber({
  videoSrc,
  values,
  setTimeline,
  disabled,
  variant = "full",
  singleMarkerKey,
  sectionTitle,
  sectionDescription,
  videoControls = true,
  className,
  /** When false, hide the range slider (keyboard/fine scrub via bumps only). */
  showTimelineSlider = true,
  /**
   * Compact bump row: «« 500ms «« 100ms | time | 100ms »» 500ms »» — hides the marker/time header row.
   * Implies no timeline slider.
   */
  compactPickFrameControls = false,
  /**
   * When true with no slider, marker updates from the video when playback pauses or when
   * the user seeks while paused (native controls).
   */
  syncMarkerFromVideoWhenNoSlider = false,
  /** Hide the title row (use when the parent dialog already shows the step title). */
  hideSingleVariantHeading = false,
}: {
  videoSrc: string | null;
  values: UtilityLineupTimelineScrubberValues;
  setTimeline: Dispatch<SetStateAction<UtilityLineupTimelineScrubberValues>>;
  disabled?: boolean;
  /** One marker + one video — use multiple instances for stand / throw / release / land / bloom. */
  variant?: "full" | "single";
  singleMarkerKey?: keyof UtilityLineupTimelineScrubberValues;
  sectionTitle?: string;
  sectionDescription?: string;
  /** When false, native video controls are hidden (e.g. dialog picker with scrubber only). */
  videoControls?: boolean;
  className?: string;
  showTimelineSlider?: boolean;
  compactPickFrameControls?: boolean;
  syncMarkerFromVideoWhenNoSlider?: boolean;
  hideSingleVariantHeading?: boolean;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  /** Keeps latest timeline without re-running the single-variant sync effect on every scrub. */
  const valuesRef = React.useRef(values);
  valuesRef.current = values;

  const [durationMs, setDurationMs] = React.useState(0);
  const [activeKeyFull, setActiveKeyFull] =
    React.useState<keyof UtilityLineupTimelineScrubberValues>("videoStartMs");

  const activeKey =
    variant === "single"
      ? (singleMarkerKey ?? "stillStandMs")
      : activeKeyFull;

  React.useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoSrc) {
      setDurationMs(0);
      return;
    }
    const onMeta = () => {
      const d = v.duration;
      if (Number.isFinite(d) && d > 0) {
        setDurationMs(snapUtilityLineupMs(Math.floor(d * 1000)));
      }
    };
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("durationchange", onMeta);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("durationchange", onMeta);
    };
  }, [videoSrc]);

  const maxSliderMs = durationMs > 0 ? durationMs : 0;

  /** Skips sync-from-video on pause/seeked when we moved the playhead in code (not the user). */
  const programmaticSeekRef = React.useRef(false);

  const seek = React.useCallback((ms: number) => {
    const v = videoRef.current;
    if (!v) return;
    programmaticSeekRef.current = true;
    v.pause();
    const dur = v.duration;
    const capSec = Number.isFinite(dur) && dur > 0 ? dur : ms / 1000;
    const sec = Math.min(Math.max(0, ms / 1000), capSec);
    if (Number.isFinite(sec)) v.currentTime = sec;
  }, []);

  const seekRafRef = React.useRef<number | null>(null);
  const seekQueuedMsRef = React.useRef<number | null>(null);

  const scheduleSeekFromScrub = React.useCallback(
    (ms: number) => {
      seekQueuedMsRef.current = ms;
      if (seekRafRef.current != null) return;
      seekRafRef.current = requestAnimationFrame(() => {
        seekRafRef.current = null;
        const q = seekQueuedMsRef.current;
        if (q != null) seek(q);
      });
    },
    [seek],
  );

  React.useEffect(() => {
    return () => {
      if (seekRafRef.current != null) {
        cancelAnimationFrame(seekRafRef.current);
        seekRafRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (variant !== "single" || !singleMarkerKey || !videoSrc) return;
    const ms = valuesRef.current[singleMarkerKey];
    if (typeof ms === "number") {
      seek(ms);
    } else {
      seek(0);
    }
  }, [variant, singleMarkerKey, videoSrc, seek]);

  const applyMarkerMs = React.useCallback(
    (
      key: keyof UtilityLineupTimelineScrubberValues,
      ms: number,
      seekHow: "scrub" | "instant",
    ) => {
      const capped =
        maxSliderMs > 0 ? Math.min(Math.max(0, ms), maxSliderMs) : Math.max(0, ms);
      const snapped = snapUtilityLineupMs(capped);
      setTimeline((prev) => ({ ...prev, [key]: snapped }));
      if (seekHow === "scrub") scheduleSeekFromScrub(snapped);
      else seek(snapped);
    },
    [maxSliderMs, scheduleSeekFromScrub, seek, setTimeline],
  );

  const capturePlayheadMs = React.useCallback(() => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.currentTime)) return 0;
    return snapUtilityLineupMs(Math.floor(v.currentTime * 1000));
  }, []);

  const effectiveShowSlider = showTimelineSlider && !compactPickFrameControls;
  const syncMarkerFromVideo =
    !effectiveShowSlider && (syncMarkerFromVideoWhenNoSlider || compactPickFrameControls);

  const sliderValue = sliderMsForMarker(activeKey, values, durationMs);

  const syncMarkerFromPlayhead = React.useCallback(() => {
    applyMarkerMs(activeKey, capturePlayheadMs(), "instant");
  }, [activeKey, applyMarkerMs, capturePlayheadMs]);

  React.useEffect(() => {
    if (!syncMarkerFromVideo || !videoSrc) return;
    const v = videoRef.current;
    if (!v) return;
    const onPause = () => {
      if (programmaticSeekRef.current) return;
      syncMarkerFromPlayhead();
    };
    const onSeeked = () => {
      if (programmaticSeekRef.current) {
        programmaticSeekRef.current = false;
        return;
      }
      if (v.paused) syncMarkerFromPlayhead();
    };
    v.addEventListener("pause", onPause);
    v.addEventListener("seeked", onSeeked);
    return () => {
      v.removeEventListener("pause", onPause);
      v.removeEventListener("seeked", onSeeked);
    };
  }, [syncMarkerFromVideo, videoSrc, durationMs, syncMarkerFromPlayhead]);
  const activeMeta = MARKERS.find((m) => m.key === activeKey)!;

  if (!videoSrc) {
    return (
      <p className="text-muted-foreground text-xs">
        Choose a video file to set timeline markers with the scrubber.
      </p>
    );
  }

  if (variant === "single" && !singleMarkerKey) {
    return (
      <p className="text-destructive text-xs" role="alert">
        Missing singleMarkerKey for single-variant scrubber.
      </p>
    );
  }

  return (
    <div
      className={cn("space-y-3 rounded-lg border border-border p-3", className)}
    >
      {variant === "single" ? (
        <>
          {!hideSingleVariantHeading ? (
            sectionTitle ? (
              <p className="text-sm font-medium">{sectionTitle}</p>
            ) : (
              <p className="text-sm font-medium">{activeMeta.label}</p>
            )
          ) : null}
          {sectionDescription ? (
            <p className="text-muted-foreground text-xs">{sectionDescription}</p>
          ) : !hideSingleVariantHeading ? (
            <p className="text-muted-foreground text-xs">
              Pause the video on the right frame using the player below. Set that
              moment with the buttons, or drag the slider. Values snap to 100 ms
              steps.
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-sm font-medium">Timeline (100 ms steps)</p>
          <p className="text-muted-foreground text-xs">
            Use the video controls to find a moment, then &quot;Use current
            time&quot; or the nudge buttons. You can also pick a marker and
            drag the slider. Values snap to 100 ms.
          </p>
        </>
      )}

      <div className="aspect-video w-full overflow-hidden rounded-md border border-border bg-black [transform:translateZ(0)]">
        <video
          ref={videoRef}
          key={videoSrc}
          src={videoSrc}
          className="h-full w-full object-contain [transform:translateZ(0)]"
          muted
          playsInline
          preload="metadata"
          controls={videoControls}
        />
      </div>

      {compactPickFrameControls ? (
        <div
          className="flex w-full min-w-0 items-center gap-2"
          role="group"
          aria-label="Adjust frame time"
        >
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 min-w-0 px-1.5 text-[11px] sm:h-9 sm:px-2 sm:text-xs"
              disabled={disabled || maxSliderMs <= 0}
              onClick={() =>
                applyMarkerMs(activeKey, sliderValue - BUMP_MS_COARSE, "instant")
              }
            >
              ≪ 500ms
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 min-w-0 px-1.5 text-[11px] sm:h-9 sm:px-2 sm:text-xs"
              disabled={disabled || maxSliderMs <= 0}
              onClick={() =>
                applyMarkerMs(activeKey, sliderValue - BUMP_MS_FINE, "instant")
              }
            >
              ≪ 100ms
            </Button>
          </div>
          <span className="text-muted-foreground min-w-0 flex-1 px-1 text-center font-mono text-xs tabular-nums sm:text-sm">
            {(sliderValue / 1000).toFixed(1)}s
          </span>
          <div className="flex shrink-0 items-center justify-end gap-0.5 sm:gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 min-w-0 px-1.5 text-[11px] sm:h-9 sm:px-2 sm:text-xs"
              disabled={disabled || maxSliderMs <= 0}
              onClick={() =>
                applyMarkerMs(activeKey, sliderValue + BUMP_MS_FINE, "instant")
              }
            >
              100ms ≫
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 min-w-0 px-1.5 text-[11px] sm:h-9 sm:px-2 sm:text-xs"
              disabled={disabled || maxSliderMs <= 0}
              onClick={() =>
                applyMarkerMs(activeKey, sliderValue + BUMP_MS_COARSE, "instant")
              }
            >
              500ms ≫
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            {variant === "full" ? (
              <div className="space-y-1">
                <Label htmlFor="utility-lineup-marker">Active marker</Label>
                <select
                  id="utility-lineup-marker"
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                  value={activeKey}
                  disabled={disabled || maxSliderMs <= 0}
                  onChange={(e) => {
                    const k = e.target.value as keyof UtilityLineupTimelineScrubberValues;
                    setActiveKeyFull(k);
                    const ms = sliderMsForMarker(k, values, durationMs);
                    seek(ms);
                  }}
                >
                  {MARKERS.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                      {m.optional && values[m.key] == null ? " (unset)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <Label>Marker</Label>
                <p className="text-muted-foreground text-sm">{activeMeta.label}</p>
              </div>
            )}
            <div className="text-right">
              <span className="text-muted-foreground font-mono text-xs tabular-nums">
                {(sliderValue / 1000).toFixed(1)}s · {sliderValue} ms
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-fit"
              disabled={disabled || maxSliderMs <= 0}
              onClick={() =>
                applyMarkerMs(activeKey, capturePlayheadMs(), "instant")
              }
            >
              Use current time
            </Button>
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label="Nudge marker by milliseconds"
            >
              {(
                [
                  { delta: -BUMP_MS_COARSE, label: "−500 ms" },
                  { delta: -BUMP_MS_FINE, label: "−100 ms" },
                  { delta: BUMP_MS_FINE, label: "+100 ms" },
                  { delta: BUMP_MS_COARSE, label: "+500 ms" },
                ] as const
              ).map(({ delta, label }) => (
                <Button
                  key={label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-w-0 font-mono text-xs tabular-nums"
                  disabled={disabled || maxSliderMs <= 0}
                  onClick={() =>
                    applyMarkerMs(activeKey, sliderValue + delta, "instant")
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {effectiveShowSlider ? (
            <div className="space-y-1">
              <Label htmlFor="utility-lineup-scrub">Timeline slider</Label>
              <input
                id="utility-lineup-scrub"
                type="range"
                min={0}
                max={Math.max(UTILITY_LINEUP_MS_STEP, maxSliderMs)}
                step={UTILITY_LINEUP_MS_STEP}
                value={Math.min(
                  sliderValue,
                  Math.max(UTILITY_LINEUP_MS_STEP, maxSliderMs),
                )}
                disabled={disabled || maxSliderMs <= 0}
                className="accent-primary h-3 w-full cursor-pointer disabled:opacity-50"
                onChange={(e) => {
                  applyMarkerMs(activeKey, Number(e.target.value), "scrub");
                }}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
