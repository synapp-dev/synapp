"use client";

import { FilmIcon, Lightbulb } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";

import { MAX_UTILITY_LINEUP_VIDEO_BYTES } from "@/lib/media/constants";

import { RECOMMENDED_CROSSHAIR_CODE } from "../constants";
import { TrimTimeInputs } from "../shared-components";
import { useUploadWizard } from "../upload-wizard-context";

export function UploadVideoStep() {
  const {
    videoFileInputRef,
    acceptVideoFile,
    videoDragActive,
    setVideoDragActive,
    file,
    filePreviewUrl,
    videoCoarsePointer,
    videoPreviewShowControls,
    setVideoPreviewShowControls,
    setVideoDurationMs,
    timeline,
    setTimeline,
    videoDurationMs,
    enqueueLoading,
  } = useUploadWizard();

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="upload-video-file" className="sr-only">
        Lineup video file
      </Label>
      <input
        ref={videoFileInputRef}
        id="upload-video-file"
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) acceptVideoFile(f);
        }}
      />
      <div className="flex flex-col gap-2">
        <div
          role="presentation"
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setVideoDragActive(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setVideoDragActive(false);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setVideoDragActive(true);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setVideoDragActive(false);
            const f = e.dataTransfer.files?.[0];
            if (f) acceptVideoFile(f);
          }}
          className={cn(
            "relative aspect-video w-full overflow-hidden rounded-xl border-2 transition-colors",
            file
              ? "border-border bg-black"
              : videoDragActive
                ? "border-primary bg-primary/10"
                : "border-dashed border-muted-foreground/40 bg-muted/40",
          )}
        >
          {file && filePreviewUrl ? (
            <div
              className="relative size-full min-h-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              tabIndex={0}
              onMouseEnter={() => setVideoPreviewShowControls(true)}
              onMouseLeave={() => setVideoPreviewShowControls(false)}
              onFocus={() => setVideoPreviewShowControls(true)}
              onBlur={() => setVideoPreviewShowControls(false)}
            >
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                src={filePreviewUrl}
                className="size-full object-contain"
                controls={videoCoarsePointer || videoPreviewShowControls}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                onLoadedMetadata={(e) => {
                  const ms = Math.round(e.currentTarget.duration * 1000);
                  if (Number.isFinite(ms) && ms > 0) {
                    setVideoDurationMs(ms);
                  }
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              className="flex size-full min-h-[8rem] flex-col items-center justify-center gap-2 p-6 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => videoFileInputRef.current?.click()}
            >
              <FilmIcon
                className="text-muted-foreground size-12 shrink-0 opacity-80"
                aria-hidden
              />
              <span className="text-sm font-medium">
                Drop a video here or click to browse
              </span>
              <span className="text-muted-foreground max-w-[18rem] text-xs">
                MP4, WebM, or MOV — max{" "}
                {Math.floor(MAX_UTILITY_LINEUP_VIDEO_BYTES / (1024 * 1024))}{" "}
                MB
              </span>
            </button>
          )}
        </div>
        {file && filePreviewUrl ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full capitalize"
            onClick={() => videoFileInputRef.current?.click()}
          >
            Replace Video
          </Button>
        ) : null}
      </div>

      {file && filePreviewUrl ? (
        <TrimTimeInputs
          idPrefix="lineup-trim"
          startMs={timeline.videoStartMs}
          endMs={timeline.videoEndMs ?? null}
          durationMs={videoDurationMs}
          disabled={enqueueLoading}
          onChange={({ startMs, endMs }) =>
            setTimeline((prev) => ({
              ...prev,
              videoStartMs: startMs,
              videoEndMs: endMs,
            }))
          }
        />
      ) : (
        <Alert className="border-muted-foreground/20 mt-8 py-3 text-xs [&>svg]:text-muted-foreground">
          <Lightbulb className="size-4 shrink-0" aria-hidden />
          <AlertTitle className="text-foreground col-start-2 line-clamp-none text-sm font-semibold leading-snug">
            How to make a great submission
          </AlertTitle>
          <AlertDescription className="text-[11px] leading-relaxed sm:text-xs">
            <div className="space-y-3">
              <section className="space-y-1">
                <p className="text-foreground font-medium">
                  Use a good crosshair:
                </p>
                <p>
                  We recommend setting this in Settings → Game → Apply
                  Crosshair Code:
                </p>
                <code className="bg-background border-border text-foreground mt-0.5 block w-fit max-w-full break-all rounded-md border px-2 py-1 font-mono text-[10px] sm:text-[11px]">
                  {RECOMMENDED_CROSSHAIR_CODE}
                </code>
              </section>
              <section className="space-y-1">
                <p className="text-foreground font-medium">
                  Submit a high quality video:
                </p>
                <p>
                  Please submit videos with a 16:9 aspect ratio at 1080p or
                  higher.
                </p>
              </section>
              <section className="space-y-1">
                <p className="text-foreground font-medium">Hide the HUD:</p>
                <p>
                  Use{" "}
                  <code className="bg-background border-border rounded px-1 py-px font-mono text-[10px] sm:text-[11px]">
                    cl_draw_only_deathnotices 1
                  </code>{" "}
                  in the console to hide your HUD.
                </p>
              </section>
              <section className="space-y-1">
                <p className="text-foreground font-medium">
                  Make it professional:
                </p>
                <p>
                  Clearly show where to throw from, how to line it up, and how
                  to throw it. Only include game audio, and optionally use
                  subtitles for clarification.
                </p>
              </section>
              <section className="space-y-1">
                <p>
                  If you are submitting a nade from a video with many nades,
                  please include the timestamp by clicking &quot;Share&quot; on
                  YouTube then selecting &quot;Start at&quot;.
                </p>
              </section>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
