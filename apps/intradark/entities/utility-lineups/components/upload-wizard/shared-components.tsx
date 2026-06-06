"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ImageIcon, X } from "lucide-react";

import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { cn } from "@workspace/ui/lib/utils";

import { snapUtilityLineupMs } from "@/entities/utility-lineups/lib/utility-lineup-ms-step";
import { useUtilityLineupVideoStillFrame } from "@/entities/utility-lineups/lib/use-utility-lineup-video-still-frame";

import { formatSecondsForInput, wizardLineupDetailTileClass } from "./helpers";

export function WizardDetailOptionButton({
  selected,
  onClick,
  icon: Icon,
  label,
  className,
  iconClassName,
}: {
  selected: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: React.ReactNode;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        wizardLineupDetailTileClass(selected),
        "flex min-h-0 items-center justify-start gap-2 px-2.5 py-2.5 font-medium",
        className,
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          selected ? "text-primary" : "text-muted-foreground",
          iconClassName,
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1 leading-tight">{label}</span>
    </button>
  );
}

export function ThrowStillCapturedFrame({
  videoUrl,
  timeMs,
}: {
  videoUrl: string;
  timeMs: number;
}) {
  const { dataUrl } = useUtilityLineupVideoStillFrame(videoUrl, timeMs);
  if (!dataUrl) {
    return (
      <div className="aspect-video w-full animate-pulse rounded-md border border-border bg-muted" />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt=""
      className="aspect-video w-full rounded-md border border-border object-cover"
    />
  );
}

export function ThrowStillSlotTemplate({
  videoUrl,
  timeMs,
}: {
  videoUrl: string | null;
  timeMs: number | null;
}) {
  if (timeMs == null || !videoUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-border/80 bg-muted/25">
        <ImageIcon
          className="text-muted-foreground size-10 shrink-0"
          aria-hidden
        />
      </div>
    );
  }
  return <ThrowStillCapturedFrame videoUrl={videoUrl} timeMs={timeMs} />;
}

/**
 * Numeric "start"/"end" trim inputs for a video step. Values are seconds with one
 * decimal place; persisted as integer ms snapped to {@link snapUtilityLineupMs}
 * (100 ms grid). Empty end input means "no trim — play to the end of the video".
 */
export function TrimTimeInputs({
  idPrefix,
  startMs,
  endMs,
  durationMs,
  disabled,
  onChange,
}: {
  idPrefix: string;
  startMs: number;
  endMs: number | null;
  durationMs: number | null;
  disabled?: boolean;
  onChange: (next: { startMs: number; endMs: number | null }) => void;
}) {
  const [startText, setStartText] = React.useState(() =>
    formatSecondsForInput(startMs),
  );
  const [endText, setEndText] = React.useState(() =>
    formatSecondsForInput(endMs),
  );

  React.useEffect(() => {
    setStartText(formatSecondsForInput(startMs));
  }, [startMs]);
  React.useEffect(() => {
    setEndText(formatSecondsForInput(endMs));
  }, [endMs]);

  function commitStart(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange({ startMs: 0, endMs });
      return;
    }
    const seconds = Number(trimmed);
    if (!Number.isFinite(seconds) || seconds < 0) {
      setStartText(formatSecondsForInput(startMs));
      return;
    }
    onChange({ startMs: snapUtilityLineupMs(seconds * 1000), endMs });
  }

  function commitEnd(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange({ startMs, endMs: null });
      return;
    }
    const seconds = Number(trimmed);
    if (!Number.isFinite(seconds) || seconds < 0) {
      setEndText(formatSecondsForInput(endMs));
      return;
    }
    onChange({ startMs, endMs: snapUtilityLineupMs(seconds * 1000) });
  }

  const durationSecondsLabel =
    durationMs != null ? (durationMs / 1000).toFixed(1) : null;

  return (
    <div className="border-border/70 bg-muted/20 space-y-3 rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Trim video</p>
        {durationSecondsLabel ? (
          <span className="text-muted-foreground text-[11px]">
            Duration {durationSecondsLabel}s
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label
            htmlFor={`${idPrefix}-start`}
            className="text-muted-foreground text-xs font-normal"
          >
            Start (s)
          </Label>
          <Input
            id={`${idPrefix}-start`}
            type="number"
            inputMode="decimal"
            step={0.1}
            min={0}
            max={
              durationMs != null
                ? Math.max(0, durationMs / 1000)
                : undefined
            }
            value={startText}
            disabled={disabled}
            placeholder="0.0"
            onChange={(e) => setStartText(e.target.value)}
            onBlur={(e) => commitStart(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitStart(e.currentTarget.value);
                e.currentTarget.blur();
              }
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor={`${idPrefix}-end`}
            className="text-muted-foreground text-xs font-normal"
          >
            End (s)
          </Label>
          <Input
            id={`${idPrefix}-end`}
            type="number"
            inputMode="decimal"
            step={0.1}
            min={0}
            max={
              durationMs != null
                ? Math.max(0, durationMs / 1000)
                : undefined
            }
            value={endText}
            disabled={disabled}
            placeholder={durationSecondsLabel ?? "End"}
            onChange={(e) => setEndText(e.target.value)}
            onBlur={(e) => commitEnd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitEnd(e.currentTarget.value);
                e.currentTarget.blur();
              }
            }}
          />
        </div>
      </div>
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        Defaults to the full clip. Enter one decimal — values snap to a 0.1 s
        grid.
      </p>
    </div>
  );
}

export function WizardSidebarVideoPeek({
  videoSrc,
  stepIndex,
}: {
  videoSrc: string;
  stepIndex: number;
}) {
  const peekWrapRef = React.useRef<HTMLDivElement>(null);
  const previewVideoRef = React.useRef<HTMLVideoElement>(null);
  const dialogVideoRef = React.useRef<HTMLVideoElement>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = React.useState(false);

  React.useEffect(() => {
    const preview = previewVideoRef.current;
    if (previewDialogOpen) {
      preview?.pause();
      const t = window.setTimeout(() => {
        const dialog = dialogVideoRef.current;
        const p = previewVideoRef.current;
        if (dialog && p) {
          dialog.currentTime = p.currentTime;
        }
        void dialog?.play().catch(() => {});
      }, 0);
      return () => clearTimeout(t);
    }
    dialogVideoRef.current?.pause();
    void preview?.play().catch(() => {});
  }, [previewDialogOpen]);

  React.useLayoutEffect(() => {
    if (stepIndex < 2) return;
    const el = peekWrapRef.current;
    if (!el) return;
    el.classList.remove(
      "animate-in",
      "fade-in",
      "slide-in-from-top-2",
      "duration-300",
    );
    void el.offsetWidth;
    requestAnimationFrame(() => {
      el.classList.add(
        "animate-in",
        "fade-in",
        "slide-in-from-top-2",
        "duration-300",
      );
    });
  }, [stepIndex]);

  return (
    <div ref={peekWrapRef} className="w-full">
      <button
        type="button"
        onClick={() => setPreviewDialogOpen(true)}
        className="ring-offset-background focus-visible:ring-ring relative aspect-video w-full cursor-pointer overflow-hidden rounded-lg border border-border bg-black shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        aria-label="Open full lineup video preview"
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={previewVideoRef}
          src={videoSrc}
          className="pointer-events-none size-full object-contain"
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
        />
      </button>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100%-2rem)] max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-0 overflow-hidden rounded-xl border-0 bg-black p-0 shadow-2xl sm:max-w-3xl"
        >
          <DialogTitle className="sr-only">Lineup video preview</DialogTitle>
          <div className="relative aspect-video w-full min-h-0 overflow-hidden rounded-xl">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={dialogVideoRef}
              src={videoSrc}
              className="size-full object-contain"
              controls
              loop
              playsInline
              autoPlay
              preload="auto"
            />
            <DialogClose
              type="button"
              className="ring-offset-background focus-visible:ring-ring absolute top-2 right-2 z-10 rounded-full bg-black/60 p-2 text-white shadow-md outline-none ring-1 ring-white/20 backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-offset-2"
              aria-label="Close preview"
            >
              <X className="size-5" aria-hidden />
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
