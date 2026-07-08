"use client";

import { Eye } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

import { MAX_UTILITY_LINEUP_VIDEO_BYTES } from "@/lib/media/constants";

import { TrimTimeInputs } from "../shared-components";
import { useUploadWizard } from "../upload-wizard-context";

export function EnemyPovStep() {
  const {
    enemyPovFileInputRef,
    acceptEnemyPovFile,
    enemyPovDragActive,
    setEnemyPovDragActive,
    enemyPovFile,
    enemyPovFilePreviewUrl,
    setEnemyPovFile,
    setEnemyPovDurationMs,
    setEnemyPovTimeline,
    enemyPovTimeline,
    enemyPovDurationMs,
    enemyPovDescription,
    setEnemyPovDescription,
    enqueueLoading,
  } = useUploadWizard();

  return (
    <div className="flex flex-col gap-4">
      <Label htmlFor="enemy-pov-video-file" className="sr-only">
        Enemy POV video file
      </Label>
      <input
        ref={enemyPovFileInputRef}
        id="enemy-pov-video-file"
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) acceptEnemyPovFile(f);
        }}
      />
      <div className="flex flex-col gap-2">
        <div
          role="presentation"
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setEnemyPovDragActive(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setEnemyPovDragActive(false);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setEnemyPovDragActive(true);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setEnemyPovDragActive(false);
            const f = e.dataTransfer.files?.[0];
            if (f) acceptEnemyPovFile(f);
          }}
          className={cn(
            "relative aspect-video w-full overflow-hidden rounded-xl border-2 transition-colors",
            enemyPovFile
              ? "border-border bg-black"
              : enemyPovDragActive
                ? "border-primary bg-primary/10"
                : "border-dashed border-muted-foreground/40 bg-muted/40",
          )}
        >
          {enemyPovFile && enemyPovFilePreviewUrl ? (
            <div className="relative size-full min-h-0">
              <video
                src={enemyPovFilePreviewUrl}
                className="size-full object-contain"
                controls
                loop
                muted
                playsInline
                preload="auto"
                onLoadedMetadata={(e) => {
                  const ms = Math.round(e.currentTarget.duration * 1000);
                  if (Number.isFinite(ms) && ms > 0) {
                    setEnemyPovDurationMs(ms);
                  }
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              className="flex size-full min-h-[8rem] flex-col items-center justify-center gap-2 p-6 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => enemyPovFileInputRef.current?.click()}
            >
              <Eye
                className="text-muted-foreground size-12 shrink-0 opacity-80"
                aria-hidden
              />
              <span className="text-sm font-medium">
                Drop the enemy POV here or click to browse
              </span>
              <span className="text-muted-foreground max-w-[18rem] text-xs">
                Optional. MP4, WebM, or MOV — max{" "}
                {Math.floor(MAX_UTILITY_LINEUP_VIDEO_BYTES / (1024 * 1024))}{" "}
                MB
              </span>
            </button>
          )}
        </div>
        {enemyPovFile ? (
          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => enemyPovFileInputRef.current?.click()}
              disabled={enqueueLoading}
            >
              Replace Video
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex-1 text-destructive"
              disabled={enqueueLoading}
              onClick={() => {
                setEnemyPovFile(null);
                setEnemyPovDurationMs(null);
                setEnemyPovTimeline({
                  videoStartMs: 0,
                  videoEndMs: null,
                });
                if (enemyPovFileInputRef.current) {
                  enemyPovFileInputRef.current.value = "";
                }
              }}
            >
              Remove
            </Button>
          </div>
        ) : null}
      </div>

      {enemyPovFile ? (
        <>
          <TrimTimeInputs
            idPrefix="enemy-pov-trim"
            startMs={enemyPovTimeline.videoStartMs}
            endMs={enemyPovTimeline.videoEndMs}
            durationMs={enemyPovDurationMs}
            disabled={enqueueLoading}
            onChange={({ startMs, endMs }) =>
              setEnemyPovTimeline({
                videoStartMs: startMs,
                videoEndMs: endMs,
              })
            }
          />
          <div className="space-y-2">
            <Label htmlFor="enemy-pov-desc">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="enemy-pov-desc"
              rows={4}
              value={enemyPovDescription}
              onChange={(e) => setEnemyPovDescription(e.target.value)}
              placeholder="Where the enemy is standing, what they see — anything that helps players read the angle."
              disabled={enqueueLoading}
            />
          </div>
        </>
      ) : (
        <Alert className="border-muted-foreground/20 py-3 text-xs [&>svg]:text-muted-foreground">
          <Eye className="size-4 shrink-0" aria-hidden />
          <AlertTitle className="text-foreground col-start-2 line-clamp-none text-sm font-semibold leading-snug">
            Skip this step if you don’t have an enemy POV
          </AlertTitle>
          <AlertDescription className="text-[11px] leading-relaxed sm:text-xs">
            When provided, the enemy POV uploads after your lineup video and
            links automatically — same trim rules, same size limits.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
