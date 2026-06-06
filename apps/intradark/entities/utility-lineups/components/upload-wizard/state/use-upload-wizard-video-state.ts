"use client";

import * as React from "react";
import { toast } from "sonner";

import type { UtilityLineupTimelineScrubberValues } from "@/entities/utility-lineups/components/utility-lineup-video-timeline-scrubber";
import { MAX_UTILITY_LINEUP_VIDEO_BYTES } from "@/lib/media/constants";
import {
  isAllowedUtilityLineupVideoMime,
  isAllowedUtilityLineupVideoSize,
} from "@/lib/media/utility-lineup-video-validation";

import { effectiveVideoMime, initialTimeline } from "../helpers";

type SetError = React.Dispatch<React.SetStateAction<string | null>>;

export function useUploadWizardVideoState(setError: SetError) {
  const [timeline, setTimeline] =
    React.useState<UtilityLineupTimelineScrubberValues>(initialTimeline);
  const [file, setFile] = React.useState<File | null>(null);
  const [videoDurationMs, setVideoDurationMs] = React.useState<number | null>(
    null,
  );
  const [enemyPovFile, setEnemyPovFile] = React.useState<File | null>(null);
  const [enemyPovDescription, setEnemyPovDescription] = React.useState("");
  const [enemyPovTimeline, setEnemyPovTimeline] = React.useState<{
    videoStartMs: number;
    videoEndMs: number | null;
  }>(() => ({ videoStartMs: 0, videoEndMs: null }));
  const [enemyPovDurationMs, setEnemyPovDurationMs] = React.useState<
    number | null
  >(null);
  const [enemyPovDragActive, setEnemyPovDragActive] = React.useState(false);
  const enemyPovFileInputRef = React.useRef<HTMLInputElement>(null);
  const videoFileInputRef = React.useRef<HTMLInputElement>(null);
  const [videoDragActive, setVideoDragActive] = React.useState(false);
  const [videoPreviewShowControls, setVideoPreviewShowControls] =
    React.useState(false);
  const [videoCoarsePointer, setVideoCoarsePointer] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: coarse)");
    const apply = () => setVideoCoarsePointer(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const acceptVideoFile = React.useCallback(
    (candidate: File) => {
      const mime = effectiveVideoMime(candidate);
      if (!isAllowedUtilityLineupVideoMime(mime)) {
        toast.error("Use MP4, WebM, or QuickTime (MOV).");
        return false;
      }
      if (!isAllowedUtilityLineupVideoSize(candidate.size)) {
        toast.error(
          `Video must be at most ${Math.floor(MAX_UTILITY_LINEUP_VIDEO_BYTES / (1024 * 1024))} MB.`,
        );
        return false;
      }
      setFile(candidate);
      setVideoDurationMs(null);
      setTimeline((prev) => ({ ...prev, videoStartMs: 0, videoEndMs: null }));
      setError(null);
      return true;
    },
    [setError],
  );

  const acceptEnemyPovFile = React.useCallback(
    (candidate: File) => {
      const mime = effectiveVideoMime(candidate);
      if (!isAllowedUtilityLineupVideoMime(mime)) {
        toast.error("Use MP4, WebM, or QuickTime (MOV).");
        return false;
      }
      if (!isAllowedUtilityLineupVideoSize(candidate.size)) {
        toast.error(
          `Video must be at most ${Math.floor(MAX_UTILITY_LINEUP_VIDEO_BYTES / (1024 * 1024))} MB.`,
        );
        return false;
      }
      setEnemyPovFile(candidate);
      setEnemyPovDurationMs(null);
      setEnemyPovTimeline({ videoStartMs: 0, videoEndMs: null });
      setError(null);
      return true;
    },
    [setError],
  );

  const filePreviewUrl = React.useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  React.useEffect(() => {
    if (!filePreviewUrl) return;
    return () => URL.revokeObjectURL(filePreviewUrl);
  }, [filePreviewUrl]);

  const enemyPovFilePreviewUrl = React.useMemo(
    () => (enemyPovFile ? URL.createObjectURL(enemyPovFile) : null),
    [enemyPovFile],
  );

  React.useEffect(() => {
    if (!enemyPovFilePreviewUrl) return;
    return () => URL.revokeObjectURL(enemyPovFilePreviewUrl);
  }, [enemyPovFilePreviewUrl]);

  const reset = React.useCallback(() => {
    setTimeline(initialTimeline());
    setFile(null);
    setVideoDurationMs(null);
    setEnemyPovFile(null);
    setEnemyPovDescription("");
    setEnemyPovTimeline({ videoStartMs: 0, videoEndMs: null });
    setEnemyPovDurationMs(null);
    setEnemyPovDragActive(false);
    setVideoPreviewShowControls(false);
    setVideoDragActive(false);
    if (videoFileInputRef.current) {
      videoFileInputRef.current.value = "";
    }
    if (enemyPovFileInputRef.current) {
      enemyPovFileInputRef.current.value = "";
    }
  }, []);

  return {
    timeline,
    setTimeline,
    file,
    videoDurationMs,
    setVideoDurationMs,
    enemyPovFile,
    setEnemyPovFile,
    enemyPovDescription,
    setEnemyPovDescription,
    enemyPovTimeline,
    setEnemyPovTimeline,
    enemyPovDurationMs,
    setEnemyPovDurationMs,
    enemyPovDragActive,
    setEnemyPovDragActive,
    enemyPovFileInputRef,
    videoFileInputRef,
    videoDragActive,
    setVideoDragActive,
    videoPreviewShowControls,
    setVideoPreviewShowControls,
    videoCoarsePointer,
    acceptVideoFile,
    acceptEnemyPovFile,
    filePreviewUrl,
    enemyPovFilePreviewUrl,
    reset,
  };
}
