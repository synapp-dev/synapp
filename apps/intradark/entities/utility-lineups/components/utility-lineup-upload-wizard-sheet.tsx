"use client";

import * as React from "react";
import { track } from "@vercel/analytics/react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Anchor,
  ArrowBigUp,
  Bomb,
  Check,
  ChevronsDown,
  ClipboardCheck,
  CloudFog,
  Crosshair,
  Equal,
  Eye,
  FilmIcon,
  Flame,
  Footprints,
  ImageIcon,
  Lightbulb,
  Map,
  MapPin,
  Minus,
  MousePointer2,
  MousePointerClick,
  Plus,
  Shuffle,
  SlidersHorizontal,
  StretchHorizontal,
  Upload,
  Users,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import { createEnemyPovUploadJobAction } from "@/entities/utility-lineups/actions/enemy-pov-upload-job-actions";
import { createUtilityLineupUploadJobAction } from "@/entities/utility-lineups/actions/user-upload-job-actions";
import { UtilityMapCard } from "@/entities/utility-lineups/components/utility-map-card";
import { UtilityMapCardsGrid } from "@/entities/utility-lineups/components/utility-map-cards-grid";
import { groupMapsByUtilityPool } from "@/entities/utility-lineups/lib/utility-map-pool-groups";
import { snapUtilityLineupMs } from "@/entities/utility-lineups/lib/utility-lineup-ms-step";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  UtilityLineupVideoTimelineScrubber,
  type UtilityLineupTimelineScrubberValues,
} from "@/entities/utility-lineups/components/utility-lineup-video-timeline-scrubber";
import {
  runEnemyPovUploadPipeline,
  runUtilityLineupJobUploadPipeline,
} from "@/entities/utility-lineups/lib/utility-lineup-job-upload-pipeline";
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
import { useUtilityLineupVideoStillFrame } from "@/entities/utility-lineups/lib/use-utility-lineup-video-still-frame";
import { useUtilityLineupUploadQueueStore } from "@/entities/utility-lineups/lib/utility-lineup-upload-queue-store";
import type { UtilityLineupUploadJobCreateInput } from "@/entities/utility-lineups/lib/user-lineup-submit-schema";
import { MAX_UTILITY_LINEUP_VIDEO_BYTES } from "@/lib/media/constants";
import {
  isAllowedUtilityLineupVideoMime,
  isAllowedUtilityLineupVideoSize,
} from "@/lib/media/utility-lineup-video-validation";

type GrenadeType = UtilityLineupUploadJobCreateInput["grenadeType"];
type SideType = UtilityLineupUploadJobCreateInput["side"];
type MovementType = UtilityLineupUploadJobCreateInput["movement"];
type TechniqueType = UtilityLineupUploadJobCreateInput["technique"];
type MarginType = UtilityLineupUploadJobCreateInput["margin"];

export type UtilityMapPickerOption = {
  id: string;
  slug: string;
  displayName: string;
  /** `map_pools.slug` — groups the picker like `/utility`. */
  poolSlug: string;
  /** Display label for pool (e.g. Active Duty) — used for grouping only. */
  poolCategory: string;
  /** Map badge — step 1 picker only (`UtilityMapList` pattern). */
  badgeImageUrl?: string | null;
  /** Radar — throw/land steps only. */
  radarImageUrl: string;
  /** Optional hero image — same asset as utility map cards when set. */
  mapScreenshotUrl?: string | null;
};

const STEP_LABELS = [
  "Choose Map",
  "Upload Video",
  "Nade Details",
  "Throw Lineup",
  "Land Lineup",
  "Enemy POV",
  "Review",
] as const;

/** Shown under “Upload lineup” — step names live in the sidebar only. */
const STEP_INSTRUCTIONS = [
  "Tap a map to choose — tap again to clear. This page’s map is selected by default.",
  "Choose a lineup video file. Upload runs after you queue; this preview powers the timeline scrubber later.",
  "Set nade details before you pin radar spots and sync the video.",
  "Place the throw on the radar, name it, then set stand frame, throw aim, and when the grenade is released.",
  "Place where it lands on the radar, name it, then set the land/result and bloom stills (pick frame, confirm preview) like the throw step.",
  "Optional — drop in a video showing what this utility looks like from the enemy’s POV. Skip to keep the submission lineup-only.",
  "Add a description for moderators and players, confirm everything looks right, then queue the upload.",
] as const;

const STEP_ICONS = [
  Map,
  FilmIcon,
  SlidersHorizontal,
  Crosshair,
  MapPin,
  Eye,
  ClipboardCheck,
] as const;

const STEP_INDEX_CHOOSE_MAP = 0;
const STEP_INDEX_UPLOAD_VIDEO = 1;
const STEP_INDEX_NADE_DETAILS = 2;
const STEP_INDEX_THROW = 3;
const STEP_INDEX_LAND = 4;
const STEP_INDEX_ENEMY_POV = 5;
const STEP_INDEX_REVIEW = 6;

const CT_SIDE_ICON_SRC = "/images/icons/ct-icon.webp";
const T_SIDE_ICON_SRC = "/images/icons/t-icon.webp";

const RECOMMENDED_CROSSHAIR_CODE = "CSGO-SM3kP-Vmtsi-fFtU4-6MGLJ-KuwTC";

const GRENADE_TYPE_OPTIONS: {
  value: GrenadeType;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "smoke", label: "Smoke", icon: CloudFog },
  { value: "molotov", label: "Molotov", icon: Flame },
  { value: "flashbang", label: "Flashbang", icon: Zap },
  { value: "he", label: "HE", icon: Bomb },
];

const MOVEMENT_OPTIONS: {
  value: MovementType;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "stationary", label: "Stationary", icon: Anchor },
  { value: "running", label: "Running", icon: Wind },
  { value: "walking", label: "Walking", icon: Footprints },
  { value: "crouched", label: "Crouched", icon: ChevronsDown },
  { value: "crouched_walking", label: "Crouch walk", icon: Shuffle },
];

const MARGIN_OPTIONS: {
  value: MarginType;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "low", label: "Low", icon: Minus },
  { value: "medium", label: "Medium", icon: Equal },
  { value: "high", label: "High", icon: Plus },
];

type TechniqueClickChoice = "left" | "right" | "both";

type TechniqueJumpSelection = "standing" | "jumping";

/** Match `utilityThrowAccent` / `utilityTravelPulseStroke` on the utility map radar. */
function landRadarThrowLineStroke(side: SideType | null): string {
  if (side === "ct") return "rgb(59 130 246)";
  return "rgb(249 115 22)";
}

function landRadarTravelPulseStroke(side: SideType | null): string {
  if (side === "ct") return "rgba(165, 215, 254, 0.82)";
  return "rgba(254, 199, 154, 0.82)";
}

function throwRadarPinPalette(side: SideType | null): {
  core: string;
  ring: string;
} {
  switch (side) {
    case "ct":
      return {
        core: "border-background bg-blue-500 shadow",
        ring: "border-blue-400",
      };
    case "t":
      return {
        core: "border-background bg-orange-500 shadow",
        ring: "border-orange-400",
      };
    case "both":
      return {
        core: "border-background bg-gradient-to-br from-blue-500 to-orange-500 shadow",
        ring: "border-white/55",
      };
    default:
      return {
        core: "border-background bg-orange-500 shadow",
        ring: "border-orange-400",
      };
  }
}

function buildTechnique(
  jumping: boolean,
  click: TechniqueClickChoice,
): TechniqueType {
  if (!jumping) {
    switch (click) {
      case "left":
        return "left_click";
      case "right":
        return "right_click";
      case "both":
        return "left_and_right_click";
      default: {
        const _n: never = click;
        return _n;
      }
    }
  }
  switch (click) {
    case "left":
      return "jump_left_click";
    case "right":
      return "jump_right_click";
    case "both":
      return "jump_left_and_right_click";
    default: {
      const _n: never = click;
      return _n;
    }
  }
}

type NadeDetailActiveRow =
  | "side"
  | "grenade"
  | "movement"
  | "technique"
  | "margin";

function nadeDetailRowLabelClass(active: boolean, reducedMotion: boolean) {
  return cn(
    "text-xs font-normal transition-colors",
    active
      ? cn(
          "font-medium text-orange-500 dark:text-orange-400",
          !reducedMotion && "animate-pulse",
        )
      : "text-muted-foreground",
  );
}

function wizardLineupDetailTileClass(
  selected: boolean,
  extraClassName?: string,
) {
  return cn(
    "border text-left transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    selected
      ? "border-primary/45 bg-background text-foreground shadow-md ring-1 ring-primary/20"
      : cn(
          "border-border/70 bg-muted/30 text-muted-foreground ring-1 ring-transparent",
          "opacity-80 hover:border-border hover:bg-muted/50 hover:opacity-100 hover:text-foreground",
        ),
    "rounded-xl",
    extraClassName,
  );
}

function WizardDetailOptionButton({
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

function initialTimeline(): UtilityLineupTimelineScrubberValues {
  return {
    videoStartMs: 0,
    videoEndMs: null,
    stillStandMs: null,
    stillThrowMs: null,
    stillLandMs: null,
    grenadeReleaseMs: null,
    grenadeBloomMs: null,
  };
}

type ThrowStillSlot = "stand" | "lineup" | "release";

const THROW_STILL_SLOTS: {
  slot: ThrowStillSlot;
  marker: keyof UtilityLineupTimelineScrubberValues;
  title: string;
  caption: string;
}[] = [
  {
    slot: "stand",
    marker: "stillStandMs",
    title: "Stand position",
    caption: "Stand position screenshot",
  },
  {
    slot: "lineup",
    marker: "stillThrowMs",
    title: "Lineup position",
    caption: "Lineup position screenshot",
  },
  {
    slot: "release",
    marker: "grenadeReleaseMs",
    title: "Release moment",
    caption: "Release position screenshot",
  },
];

type LandStillSlot = "landStill" | "bloom";

const LAND_STILL_SLOTS: {
  slot: LandStillSlot;
  marker: keyof UtilityLineupTimelineScrubberValues;
  title: string;
  caption: string;
}[] = [
  {
    slot: "landStill",
    marker: "stillLandMs",
    title: "Land / result still",
    caption: "Land / result screenshot",
  },
  {
    slot: "bloom",
    marker: "grenadeBloomMs",
    title: "Grenade blooms",
    caption: "Bloom screenshot",
  },
];

function throwStillPickDescription(
  slot: ThrowStillSlot,
  grenadeLabelLower: string,
): string {
  switch (slot) {
    case "stand":
      return `Pause the video (facing the lineup, not in the actual lineup spot) of where the player should stand to throw the ${grenadeLabelLower}.`;
    case "lineup":
      return `Pause the video at the POV where your crosshair matches the throw — still from your stand, not in the lineup spot. Use the nudge buttons if you need to fine-tune. A tip is to select the frame just before the grenade camera appears.`;
    case "release":
      return `Pause the video at the moment the ${grenadeLabelLower} leaves your hand. Start from the frame where the grenade camera switches from the landing target to the flight path. Use the nudge buttons if you need to fine-tune.`;
    default: {
      const _n: never = slot;
      return _n;
    }
  }
}

function landResultStillPickDescription(grenadeLabelLower: string): string {
  return `Pause the video on the frame that shows the end of the utility — e.g. flash has exploded, HE has exploded, molotov has reached full spread, or smoke has fully bloomed (whatever fits your ${grenadeLabelLower}). Use the nudge buttons if you need to fine-tune.`;
}

function grenadeBloomPickDescription(grenadeLabelLower: string): string {
  return `Pause the video on the first frame where your ${grenadeLabelLower} has finished — smoke filled in, molotov spread, flash popped, or whatever fits that utility. Use the nudge buttons if you need to fine-tune. A tip is to use the first frame after the grenade camera disappears.`;
}

function landStillPickDescription(
  slot: LandStillSlot,
  grenadeLabelLower: string,
): string {
  switch (slot) {
    case "landStill":
      return landResultStillPickDescription(grenadeLabelLower);
    case "bloom":
      return grenadeBloomPickDescription(grenadeLabelLower);
    default: {
      const _n: never = slot;
      return _n;
    }
  }
}

function ThrowStillCapturedFrame({
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

function ThrowStillSlotTemplate({
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

function resolvedVideoContentType(
  file: File,
): UtilityLineupUploadJobCreateInput["videoContentType"] {
  if (file.type === "video/webm") return "video/webm";
  if (file.type === "video/quicktime") return "video/quicktime";
  return "video/mp4";
}

function formatSecondsForInput(ms: number | null | undefined): string {
  if (ms == null) return "";
  return (ms / 1000).toFixed(1);
}

/**
 * Numeric "start"/"end" trim inputs for a video step. Values are seconds with one
 * decimal place; persisted as integer ms snapped to {@link snapUtilityLineupMs}
 * (100 ms grid). Empty end input means "no trim — play to the end of the video".
 */
function TrimTimeInputs({
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

function effectiveVideoMime(file: File): string {
  if (file.type && isAllowedUtilityLineupVideoMime(file.type)) {
    return file.type;
  }
  return resolvedVideoContentType(file);
}

function WizardSidebarVideoPeek({
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

export function UtilityLineupUploadButton({
  maps,
  uploadGate,
  mapSlug: initialMapSlug,
  displayName: initialDisplayName,
  radarImageUrl: initialRadarImageUrl,
  authUserId,
}: {
  maps: UtilityMapPickerOption[];
  uploadGate: { canUpload: boolean; message: string | null };
  mapSlug: string;
  displayName: string;
  radarImageUrl: string;
  authUserId: string | null;
}) {
  const [open, setOpen] = React.useState(false);

  if (uploadGate.canUpload) {
    return (
      <>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={() => {
            setOpen(true);
            void track("utility_upload_wizard_opened", {
              map_slug: initialMapSlug,
            });
          }}
        >
          Upload lineup
        </Button>
        <UtilityLineupUploadWizardSheet
          open={open}
          onOpenChange={setOpen}
          maps={maps}
          initialMapSlug={initialMapSlug}
          initialDisplayName={initialDisplayName}
          initialRadarImageUrl={initialRadarImageUrl}
        />
      </>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      asChild
      title={uploadGate.message ?? undefined}
    >
      <Link href={authUserId ? "/dashboard" : "/auth"}>
        {authUserId ? "Upload locked" : "Sign in to upload"}
      </Link>
    </Button>
  );
}

function UtilityLineupUploadWizardSheet({
  open,
  onOpenChange,
  maps,
  initialMapSlug,
  initialDisplayName,
  initialRadarImageUrl,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  maps: UtilityMapPickerOption[];
  initialMapSlug: string;
  initialDisplayName: string;
  initialRadarImageUrl: string;
}) {
  const [stepIndex, setStepIndex] = React.useState(0);
  const [selectedMapSlug, setSelectedMapSlug] = React.useState<string | null>(
    null,
  );
  const selectedMap = React.useMemo(
    () =>
      selectedMapSlug
        ? maps.find((m) => m.slug === selectedMapSlug)
        : undefined,
    [maps, selectedMapSlug],
  );

  const mapPickerSections = React.useMemo(
    () => groupMapsByUtilityPool(maps),
    [maps],
  );

  const mapPickerSectionsWithStagger = React.useMemo(() => {
    let i = 0;
    return mapPickerSections.map((section) => ({
      ...section,
      mapsWithIndex: section.maps.map((m) => ({ m, staggerIndex: i++ })),
    }));
  }, [mapPickerSections]);

  const prefersReducedMotion = usePrefersReducedMotion();

  const nadeRowStagger = React.useMemo(
    () => ({
      fadeDirection: "left" as const,
      chainFromZero: true,
      baseDelay: 0,
      incrementDelay: 0.07,
      reducedMotion: prefersReducedMotion,
    }),
    [prefersReducedMotion],
  );

  const mapping = React.useMemo(
    () => radarNormMappingForMap(selectedMap?.slug ?? initialMapSlug),
    [selectedMap?.slug, initialMapSlug],
  );
  const dialogRadarImgRef = React.useRef<HTMLImageElement | null>(null);
  const { layout: dialogRadarLayout, recompute: recomputeDialogRadarLayout } =
    useRadarImgLayout(dialogRadarImgRef);

  const [radarDialogKind, setRadarDialogKind] = React.useState<
    "throw" | "land" | null
  >(null);
  const [pendingRadarNorm, setPendingRadarNorm] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const [throwSpotNamingOpen, setThrowSpotNamingOpen] = React.useState(false);
  const [throwSpotLabelDraft, setThrowSpotLabelDraft] = React.useState("");
  const [landSpotNamingOpen, setLandSpotNamingOpen] = React.useState(false);
  const [landSpotLabelDraft, setLandSpotLabelDraft] = React.useState("");
  const [throwStillDialogSlot, setThrowStillDialogSlot] =
    React.useState<ThrowStillSlot | null>(null);
  const [throwStillConfirmSlot, setThrowStillConfirmSlot] =
    React.useState<ThrowStillSlot | null>(null);
  const throwStillTimelineSnapshotRef =
    React.useRef<UtilityLineupTimelineScrubberValues>(initialTimeline());
  const throwStillCommitRef = React.useRef(false);
  const skipThrowStillRestoreRef = React.useRef(false);
  const throwStillConfirmSlotRef = React.useRef<ThrowStillSlot | null>(null);

  const [landStillDialogSlot, setLandStillDialogSlot] =
    React.useState<LandStillSlot | null>(null);
  const [landStillConfirmSlot, setLandStillConfirmSlot] =
    React.useState<LandStillSlot | null>(null);
  const landStillTimelineSnapshotRef =
    React.useRef<UtilityLineupTimelineScrubberValues>(initialTimeline());
  const landStillCommitRef = React.useRef(false);
  const skipLandStillRestoreRef = React.useRef(false);
  const landStillConfirmSlotRef = React.useRef<LandStillSlot | null>(null);

  const [throwNorm, setThrowNorm] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const [landNorm, setLandNorm] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const [grenadeType, setGrenadeType] = React.useState<GrenadeType | null>(
    null,
  );
  const [side, setSide] = React.useState<SideType | null>(null);
  const [movement, setMovement] = React.useState<MovementType | null>(null);
  const [techniqueJump, setTechniqueJump] =
    React.useState<TechniqueJumpSelection | null>(null);
  const [techniqueClick, setTechniqueClick] =
    React.useState<TechniqueClickChoice | null>(null);
  const [margin, setMargin] = React.useState<MarginType | null>(null);

  const resolvedTechnique = React.useMemo((): TechniqueType | null => {
    if (techniqueJump === null || techniqueClick === null) return null;
    return buildTechnique(
      techniqueJump === "jumping",
      techniqueClick,
    );
  }, [techniqueJump, techniqueClick]);

  const nadeDetailActiveRow = React.useMemo((): NadeDetailActiveRow | null => {
    if (stepIndex !== STEP_INDEX_NADE_DETAILS) return null;
    if (side === null) return "side";
    if (grenadeType === null) return "grenade";
    if (movement === null) return "movement";
    if (resolvedTechnique === null) return "technique";
    if (margin === null) return "margin";
    return null;
  }, [stepIndex, side, grenadeType, movement, resolvedTechnique, margin]);

  const [throwLabel, setThrowLabel] = React.useState("");
  const [landLabel, setLandLabel] = React.useState("");
  const [description, setDescription] = React.useState("");
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
  const [enqueueLoading, setEnqueueLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false);
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

  const acceptVideoFile = React.useCallback((candidate: File) => {
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
  }, []);

  const acceptEnemyPovFile = React.useCallback((candidate: File) => {
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
  }, []);

  React.useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setSelectedMapSlug(null);
      setThrowNorm(null);
      setLandNorm(null);
      setGrenadeType(null);
      setSide(null);
      setMovement(null);
      setTechniqueJump(null);
      setTechniqueClick(null);
      setMargin(null);
      setThrowLabel("");
      setLandLabel("");
      setDescription("");
      setTimeline(initialTimeline());
      setFile(null);
      setVideoDurationMs(null);
      setEnemyPovFile(null);
      setEnemyPovDescription("");
      setEnemyPovTimeline({ videoStartMs: 0, videoEndMs: null });
      setEnemyPovDurationMs(null);
      setEnemyPovDragActive(false);
      setVideoPreviewShowControls(false);
      setEnqueueLoading(false);
      setError(null);
      setConfirmCloseOpen(false);
      setVideoDragActive(false);
      setRadarDialogKind(null);
      setPendingRadarNorm(null);
      setThrowSpotNamingOpen(false);
      setThrowSpotLabelDraft("");
      setLandSpotNamingOpen(false);
      setLandSpotLabelDraft("");
      setThrowStillDialogSlot(null);
      setThrowStillConfirmSlot(null);
      setLandStillDialogSlot(null);
      setLandStillConfirmSlot(null);
      if (videoFileInputRef.current) {
        videoFileInputRef.current.value = "";
      }
      if (enemyPovFileInputRef.current) {
        enemyPovFileInputRef.current.value = "";
      }
      return;
    }
    const match = maps.find((m) => m.slug === initialMapSlug);
    setSelectedMapSlug(match ? initialMapSlug : (maps[0]?.slug ?? null));
  }, [open, initialMapSlug, maps]);

  React.useEffect(() => {
    setThrowNorm(null);
    setLandNorm(null);
  }, [selectedMapSlug]);

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

  const isDirty =
    stepIndex > 0 ||
    file !== null ||
    throwNorm !== null ||
    landNorm !== null ||
    throwLabel.trim() !== "" ||
    landLabel.trim() !== "" ||
    description.trim() !== "" ||
    enemyPovFile !== null ||
    enemyPovDescription.trim() !== "";

  function handleSheetOpenChange(next: boolean) {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (isDirty) {
      setConfirmCloseOpen(true);
      return;
    }
    onOpenChange(false);
  }

  function confirmAbandon() {
    void track("utility_upload_wizard_abandoned", {
      step_index: stepIndex,
      map_slug: selectedMap?.slug ?? initialMapSlug,
    });
    setConfirmCloseOpen(false);
    onOpenChange(false);
  }

  const openThrowRadarForPick = React.useCallback(() => {
    if (throwNorm !== null) {
      setThrowNorm(null);
      setThrowLabel("");
    }
    setPendingRadarNorm(null);
    setThrowSpotNamingOpen(false);
    setThrowSpotLabelDraft("");
    setRadarDialogKind("throw");
  }, [throwNorm]);

  const openLandRadarForPick = React.useCallback(() => {
    if (landNorm !== null) {
      setLandNorm(null);
      setLandLabel("");
    }
    setPendingRadarNorm(null);
    setLandSpotNamingOpen(false);
    setLandSpotLabelDraft("");
    setRadarDialogKind("land");
  }, [landNorm]);

  const onDialogRadarClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const img = dialogRadarImgRef.current;
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
      setPendingRadarNorm(mapDisplayRadarNormToStored(dx, dy, mapping));
    },
    [mapping],
  );

  const dialogPinOverlayStyle = React.useMemo((): React.CSSProperties | null => {
    if (!pendingRadarNorm) return null;
    const disp = mapStoredRadarNormToDisplay(
      pendingRadarNorm.x,
      pendingRadarNorm.y,
      mapping,
    );
    if (!dialogRadarLayout) {
      return {
        left: `${disp.x * 100}%`,
        top: `${disp.y * 100}%`,
      };
    }
    const { leftPct, topPct } = displayNormToOverlayPercent(
      dialogRadarLayout,
      disp.x,
      disp.y,
    );
    return { left: `${leftPct}%`, top: `${topPct}%` };
  }, [pendingRadarNorm, dialogRadarLayout, mapping]);

  const landRadarOverlaySvgPoint = React.useCallback(
    (storedNx: number, storedNy: number) => {
      const d = mapStoredRadarNormToDisplay(storedNx, storedNy, mapping);
      if (!dialogRadarLayout) {
        return { x: d.x * 100, y: d.y * 100 };
      }
      return displayNormToSvgPercent(dialogRadarLayout, d.x, d.y);
    },
    [mapping, dialogRadarLayout],
  );

  const landRadarThrowPinStyle = React.useMemo((): React.CSSProperties | null => {
    if (!throwNorm) return null;
    const disp = mapStoredRadarNormToDisplay(
      throwNorm.x,
      throwNorm.y,
      mapping,
    );
    if (!dialogRadarLayout) {
      return {
        left: `${disp.x * 100}%`,
        top: `${disp.y * 100}%`,
      };
    }
    const { leftPct, topPct } = displayNormToOverlayPercent(
      dialogRadarLayout,
      disp.x,
      disp.y,
    );
    return { left: `${leftPct}%`, top: `${topPct}%` };
  }, [throwNorm, mapping, dialogRadarLayout]);

  const throwRadarPositionComplete =
    throwNorm !== null && throwLabel.trim() !== "";

  const landRadarPositionComplete =
    landNorm !== null && landLabel.trim() !== "";

  const openThrowStillDialog = React.useCallback(
    (slot: ThrowStillSlot) => {
      throwStillTimelineSnapshotRef.current = { ...timeline };
      throwStillCommitRef.current = false;
      setThrowStillDialogSlot(slot);
    },
    [timeline],
  );

  React.useEffect(() => {
    throwStillConfirmSlotRef.current = throwStillConfirmSlot;
  }, [throwStillConfirmSlot]);

  React.useEffect(() => {
    landStillConfirmSlotRef.current = landStillConfirmSlot;
  }, [landStillConfirmSlot]);

  const openLandStillDialog = React.useCallback(
    (slot: LandStillSlot) => {
      landStillTimelineSnapshotRef.current = { ...timeline };
      landStillCommitRef.current = false;
      setLandStillDialogSlot(slot);
    },
    [timeline],
  );

  function onLandStillDialogOpenChange(next: boolean) {
    if (!next) {
      if (!landStillCommitRef.current && !skipLandStillRestoreRef.current) {
        setTimeline(landStillTimelineSnapshotRef.current);
      }
      skipLandStillRestoreRef.current = false;
      landStillCommitRef.current = false;
      setLandStillDialogSlot(null);
    }
  }

  function proceedLandStillToConfirm() {
    const slot = landStillDialogSlot;
    if (!slot) return;
    const meta = LAND_STILL_SLOTS.find((s) => s.slot === slot);
    if (!meta || timeline[meta.marker] == null) return;
    skipLandStillRestoreRef.current = true;
    setLandStillConfirmSlot(slot);
    setLandStillDialogSlot(null);
  }

  function confirmLandStillFinal() {
    if (!landStillConfirmSlot) return;
    landStillCommitRef.current = true;
    setLandStillConfirmSlot(null);
  }

  function onLandStillConfirmOpenChange(next: boolean) {
    if (!next) {
      if (!landStillCommitRef.current) {
        const slot = landStillConfirmSlotRef.current;
        if (slot) {
          skipLandStillRestoreRef.current = true;
          setLandStillDialogSlot(slot);
        }
      }
      landStillCommitRef.current = false;
      setLandStillConfirmSlot(null);
    }
  }

  function onThrowStillDialogOpenChange(next: boolean) {
    if (!next) {
      if (!throwStillCommitRef.current && !skipThrowStillRestoreRef.current) {
        setTimeline(throwStillTimelineSnapshotRef.current);
      }
      skipThrowStillRestoreRef.current = false;
      throwStillCommitRef.current = false;
      setThrowStillDialogSlot(null);
    }
  }

  function proceedThrowStillToConfirm() {
    const slot = throwStillDialogSlot;
    if (!slot) return;
    const meta = THROW_STILL_SLOTS.find((s) => s.slot === slot);
    if (!meta || timeline[meta.marker] == null) return;
    skipThrowStillRestoreRef.current = true;
    setThrowStillConfirmSlot(slot);
    setThrowStillDialogSlot(null);
  }

  function confirmThrowStillFinal() {
    if (!throwStillConfirmSlot) return;
    throwStillCommitRef.current = true;
    setThrowStillConfirmSlot(null);
  }

  function onThrowStillConfirmOpenChange(next: boolean) {
    if (!next) {
      if (!throwStillCommitRef.current) {
        const slot = throwStillConfirmSlotRef.current;
        if (slot) {
          skipThrowStillRestoreRef.current = true;
          setThrowStillDialogSlot(slot);
        }
      }
      throwStillCommitRef.current = false;
      setThrowStillConfirmSlot(null);
    }
  }

  function handleRadarDialogOk() {
    if (!pendingRadarNorm || !radarDialogKind) return;
    if (radarDialogKind === "throw") {
      setThrowSpotLabelDraft("");
      setThrowSpotNamingOpen(true);
      return;
    }
    if (radarDialogKind === "land") {
      setLandSpotLabelDraft("");
      setLandSpotNamingOpen(true);
      return;
    }
  }

  function handleThrowSpotNamingConfirm() {
    const label = throwSpotLabelDraft.trim();
    if (!label || !pendingRadarNorm) return;
    setThrowNorm(pendingRadarNorm);
    setThrowLabel(label);
    setThrowSpotNamingOpen(false);
    setRadarDialogKind(null);
    setPendingRadarNorm(null);
  }

  function handleLandSpotNamingConfirm() {
    const label = landSpotLabelDraft.trim();
    if (!label || !pendingRadarNorm) return;
    setLandNorm(pendingRadarNorm);
    setLandLabel(label);
    setLandSpotNamingOpen(false);
    setRadarDialogKind(null);
    setPendingRadarNorm(null);
  }

  function closeRadarDialog() {
    setRadarDialogKind(null);
    setPendingRadarNorm(null);
    setThrowSpotNamingOpen(false);
    setLandSpotNamingOpen(false);
  }

  function validateTrimWindow(
    startMs: number,
    endMs: number | null,
    durationMs: number | null,
  ): string | null {
    if (startMs < 0) return "Start time can't be negative.";
    if (durationMs != null && startMs >= durationMs) {
      return "Start time must be before the end of the video.";
    }
    if (endMs != null) {
      if (endMs <= startMs) return "End time must be after start time.";
      if (durationMs != null && endMs > durationMs) {
        return "End time must be within the video.";
      }
    }
    return null;
  }

  function validateStep(i: number): string | null {
    switch (i) {
      case STEP_INDEX_CHOOSE_MAP:
        return selectedMapSlug ? null : "Select a map.";
      case STEP_INDEX_UPLOAD_VIDEO:
        if (!file) return "Choose a video file.";
        return validateTrimWindow(
          timeline.videoStartMs,
          timeline.videoEndMs ?? null,
          videoDurationMs,
        );
      case STEP_INDEX_NADE_DETAILS:
        if (!file) return "Upload a video first.";
        if (side === null) return "Select a side.";
        if (grenadeType === null) return "Select a grenade type.";
        if (movement === null) return "Select a movement type.";
        if (techniqueJump === null || techniqueClick === null)
          return "Choose standing or jumping and a click type.";
        if (margin === null) return "Select margin for error.";
        return null;
      case STEP_INDEX_THROW:
        if (!throwNorm) return "Place your throw on the radar.";
        if (!throwLabel.trim()) return "Enter a throw label.";
        if (timeline.stillStandMs == null)
          return "Set the frame showing where to stand.";
        if (timeline.stillThrowMs == null)
          return "Set the frame showing throw aim.";
        if (timeline.grenadeReleaseMs == null)
          return "Set when the grenade is released.";
        return null;
      case STEP_INDEX_LAND:
        if (!landNorm) return "Place your land spot on the radar.";
        if (!landLabel.trim()) return "Enter a land label.";
        if (timeline.stillLandMs == null)
          return "Set the land / result still frame.";
        if (timeline.grenadeBloomMs == null)
          return "Set when the grenade blooms.";
        return null;
      case STEP_INDEX_ENEMY_POV:
        if (!enemyPovFile) return null;
        return validateTrimWindow(
          enemyPovTimeline.videoStartMs,
          enemyPovTimeline.videoEndMs,
          enemyPovDurationMs,
        );
      case STEP_INDEX_REVIEW:
        return description.trim() ? null : "Enter a description.";
      default:
        return null;
    }
  }

  function canNavigateToStep(target: number): boolean {
    for (let j = 0; j < target; j++) {
      if (validateStep(j) !== null) return false;
    }
    return true;
  }

  async function enqueue() {
    const v = validateStep(STEP_INDEX_REVIEW);
    if (v) {
      setError(v);
      return;
    }
    if (!file || !throwNorm || !landNorm || !selectedMap) {
      setError("Missing required fields.");
      return;
    }

    setEnqueueLoading(true);
    setError(null);

    const payload: UtilityLineupUploadJobCreateInput = {
      mapId: selectedMap.id,
      mapSlug: selectedMap.slug,
      throwSpotX: throwNorm.x,
      throwSpotY: throwNorm.y,
      landSpotX: landNorm.x,
      landSpotY: landNorm.y,
      throwLabel: throwLabel.trim(),
      landLabel: landLabel.trim(),
      grenadeType: grenadeType!,
      side: side!,
      movement: movement!,
      technique: resolvedTechnique!,
      margin: margin!,
      videoStartMs: timeline.videoStartMs,
      videoEndMs: timeline.videoEndMs,
      stillStandMs: timeline.stillStandMs,
      stillThrowMs: timeline.stillThrowMs,
      stillLandMs: timeline.stillLandMs,
      grenadeReleaseMs: timeline.grenadeReleaseMs,
      grenadeBloomMs: timeline.grenadeBloomMs,
      description: description.trim(),
      setposText: null,
      youtubeUrl: null,
      lineupImageUrl: null,
      videoContentType: resolvedVideoContentType(file),
      videoByteLength: file.size,
    };

    const created = await createUtilityLineupUploadJobAction(payload);
    setEnqueueLoading(false);
    if (!created.ok) {
      setError(created.message);
      toast.error(created.message);
      return;
    }

    const lineupJobId = created.jobId;
    const enemyPovFileSnapshot = enemyPovFile;
    const enemyPovDescriptionSnapshot = enemyPovDescription.trim();
    const enemyPovTimelineSnapshot = enemyPovTimeline;
    const grenadeTypeSnapshot = grenadeType!;
    const mapSlugSnapshot = selectedMap.slug;

    const store = useUtilityLineupUploadQueueStore.getState();
    store.registerPendingFile(lineupJobId, file);
    store.setJobProgress(lineupJobId, 0);
    void runUtilityLineupJobUploadPipeline({
      jobId: lineupJobId,
      file,
      onProgress: (pct) => store.setJobProgress(lineupJobId, pct),
    }).then(async (r) => {
      store.clearJobProgress(lineupJobId);
      if (!r.ok) {
        toast.error(r.message);
        store.notifyJobsMutated();
        return;
      }
      store.clearPendingFile(lineupJobId);
      toast.success("Lineup submitted for review.");
      store.notifyJobsMutated();

      if (!enemyPovFileSnapshot) return;

      const povCreated = await createEnemyPovUploadJobAction({
        lineupId: r.lineupId,
        mapSlug: mapSlugSnapshot,
        grenadeType: grenadeTypeSnapshot,
        description: enemyPovDescriptionSnapshot || null,
        videoStartMs: enemyPovTimelineSnapshot.videoStartMs,
        videoEndMs: enemyPovTimelineSnapshot.videoEndMs,
        videoContentType: resolvedVideoContentType(enemyPovFileSnapshot),
        videoByteLength: enemyPovFileSnapshot.size,
      });
      if (!povCreated.ok) {
        toast.error(`Enemy POV: ${povCreated.message}`);
        return;
      }

      const povJobId = povCreated.jobId;
      store.registerPendingFile(povJobId, enemyPovFileSnapshot);
      store.setJobProgress(povJobId, 0);
      store.notifyJobsMutated();

      const povResult = await runEnemyPovUploadPipeline({
        jobId: povJobId,
        file: enemyPovFileSnapshot,
        onProgress: (pct) => store.setJobProgress(povJobId, pct),
      });
      store.clearJobProgress(povJobId);
      if (povResult.ok) {
        store.clearPendingFile(povJobId);
        toast.success("Enemy POV uploaded.");
      } else {
        toast.error(`Enemy POV: ${povResult.message}`);
      }
      store.notifyJobsMutated();
    });

    onOpenChange(false);
    toast.message("Upload queued — watch progress in the header.");
  }

  const stepErr = validateStep(stepIndex);
  const throwStillDialogMeta = throwStillDialogSlot
    ? THROW_STILL_SLOTS.find((s) => s.slot === throwStillDialogSlot)
    : undefined;
  const throwStillConfirmMeta = throwStillConfirmSlot
    ? THROW_STILL_SLOTS.find((s) => s.slot === throwStillConfirmSlot)
    : undefined;
  const landStillDialogMeta = landStillDialogSlot
    ? LAND_STILL_SLOTS.find((s) => s.slot === landStillDialogSlot)
    : undefined;
  const landStillConfirmMeta = landStillConfirmSlot
    ? LAND_STILL_SLOTS.find((s) => s.slot === landStillConfirmSlot)
    : undefined;
  const grenadeLabelForThrowStills = grenadeType
    ? (GRENADE_TYPE_OPTIONS.find((o) => o.value === grenadeType)?.label.toLowerCase() ??
      "utility")
    : "utility";
  const headerContextName = selectedMap?.displayName ?? initialDisplayName;

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="top"
          className="left-1/2 flex h-[min(46rem,92dvh)] max-h-[92dvh] w-full max-w-4xl -translate-x-1/2 flex-col gap-0 overflow-hidden rounded-b-xl border-x border-b px-4 pb-6 pt-2 sm:px-8"
        >
          <div className="flex h-full min-h-0 w-full flex-col gap-0">
            <SheetHeader className="border-border flex h-full max-h-24 shrink-0 flex-col justify-center gap-1 border-b p-0 text-left">
              <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                <Upload className="size-6 text-primary" />
                Upload Lineup
              </SheetTitle>
              <SheetDescription className="line-clamp-4 leading-snug">
                {STEP_INSTRUCTIONS[stepIndex]}
              </SheetDescription>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-8 py-4 sm:flex-row">
              <div className="flex w-full shrink-0 flex-col gap-3 sm:w-44 sm:self-start">
                <nav
                  aria-label="Wizard steps"
                  className="bg-muted/25 flex h-fit w-full shrink-0 gap-1 overflow-x-auto overflow-y-hidden rounded-xl px-2 py-2 sm:flex-col sm:overflow-x-visible sm:px-3 sm:py-3"
                >
                  {STEP_LABELS.map((label, i) => {
                    const unlocked = canNavigateToStep(i);
                    const complete = validateStep(i) === null;
                    const active = stepIndex === i;
                    const StepGlyph = STEP_ICONS[i]!;
                    return (
                      <button
                        key={label}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => {
                          if (unlocked) setStepIndex(i);
                        }}
                        className={cn(
                          "flex min-w-[10rem] shrink-0 items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors sm:min-w-0 sm:shrink",
                          active && "bg-background font-medium shadow-sm",
                          !unlocked && "cursor-not-allowed opacity-45",
                          unlocked && !active && "hover:bg-background/70",
                        )}
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center">
                          {complete ? (
                            <Check
                              className="text-primary size-4 shrink-0"
                              aria-hidden
                            />
                          ) : (
                            <StepGlyph
                              className="text-muted-foreground size-4 shrink-0"
                              aria-hidden
                            />
                          )}
                        </span>
                        <span className="line-clamp-2 leading-snug">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </nav>
                {stepIndex >= STEP_INDEX_NADE_DETAILS &&
                stepIndex !== STEP_INDEX_ENEMY_POV &&
                filePreviewUrl ? (
                  <WizardSidebarVideoPeek
                    videoSrc={filePreviewUrl}
                    stepIndex={stepIndex}
                  />
                ) : null}
              </div>

              <ScrollArea className="min-h-0 flex-1">
                {error ? (
                  <p className="text-destructive mb-3 text-sm" role="alert">
                    {error}
                  </p>
                ) : null}

                {stepIndex === STEP_INDEX_CHOOSE_MAP ? (
                  <div className="space-y-12">
                    {mapPickerSectionsWithStagger.map(
                      ({ poolSlug, heading, mapsWithIndex }) => (
                        <section
                          key={poolSlug}
                          className="space-y-2"
                          aria-labelledby={`upload-map-pool-${poolSlug}`}
                        >
                          <h3
                            id={`upload-map-pool-${poolSlug}`}
                            className="text-foreground text-sm font-semibold tracking-tight"
                          >
                            {heading}
                          </h3>
                          <UtilityMapCardsGrid variant="picker">
                            {mapsWithIndex.map(({ m, staggerIndex }) => {
                              const selected = selectedMapSlug === m.slug;
                              const hasPick = selectedMapSlug != null;
                              return (
                                <UtilityMapCard
                                  key={m.id}
                                  size="sm"
                                  borderless
                                  m={{
                                    slug: m.slug,
                                    displayName: m.displayName,
                                    badgeImageUrl: m.badgeImageUrl,
                                    mapScreenshotUrl: m.mapScreenshotUrl,
                                  }}
                                  selectable
                                  selected={selected}
                                  dimmedUnselected={hasPick && !selected}
                                  staggerIndex={staggerIndex}
                                  staggerReducedMotion={prefersReducedMotion}
                                  onSelect={() =>
                                    setSelectedMapSlug((cur) =>
                                      cur === m.slug ? null : m.slug,
                                    )
                                  }
                                />
                              );
                            })}
                          </UtilityMapCardsGrid>
                        </section>
                      ),
                    )}
                  </div>
                ) : null}

                {stepIndex === STEP_INDEX_UPLOAD_VIDEO ? (
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
                          if (
                            !e.currentTarget.contains(e.relatedTarget as Node)
                          ) {
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
                            onMouseEnter={() =>
                              setVideoPreviewShowControls(true)
                            }
                            onMouseLeave={() =>
                              setVideoPreviewShowControls(false)
                            }
                            onFocus={() => setVideoPreviewShowControls(true)}
                            onBlur={() => setVideoPreviewShowControls(false)}
                          >
                            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                            <video
                              src={filePreviewUrl}
                              className="size-full object-contain"
                              controls={
                                videoCoarsePointer || videoPreviewShowControls
                              }
                              autoPlay
                              loop
                              muted
                              playsInline
                              preload="auto"
                              onLoadedMetadata={(e) => {
                                const ms = Math.round(
                                  e.currentTarget.duration * 1000,
                                );
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
                              {Math.floor(
                                MAX_UTILITY_LINEUP_VIDEO_BYTES / (1024 * 1024),
                              )}{" "}
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
                                We recommend setting this in Settings → Game →
                                Apply Crosshair Code:
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
                                Please submit videos with a 16:9 aspect ratio at
                                1080p or higher.
                              </p>
                            </section>
                            <section className="space-y-1">
                              <p className="text-foreground font-medium">
                                Hide the HUD:
                              </p>
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
                                Clearly show where to throw from, how to line it
                                up, and how to throw it. Only include game
                                audio, and optionally use subtitles for
                                clarification.
                              </p>
                            </section>
                            <section className="space-y-1">
                              <p>
                                If you are submitting a nade from a video with
                                many nades, please include the timestamp by
                                clicking &quot;Share&quot; on YouTube then
                                selecting &quot;Start at&quot;.
                              </p>
                            </section>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : null}

                {stepIndex === STEP_INDEX_NADE_DETAILS ? (
                  <div className="flex w-full min-w-0 flex-col gap-10">
                    <div className="w-full min-w-0 space-y-2">
                      <Label
                        className={nadeDetailRowLabelClass(
                          nadeDetailActiveRow === "side",
                          prefersReducedMotion,
                        )}
                      >
                        Side
                      </Label>
                      <div className="grid w-full min-w-0 grid-cols-3 gap-2">
                        <StaggeredAnimation
                          {...nadeRowStagger}
                          className="min-w-0 w-full"
                          index={0}
                        >
                          <button
                            type="button"
                            onClick={() => setSide("ct")}
                            className={cn(
                              wizardLineupDetailTileClass(side === "ct"),
                              "group flex min-h-14 w-full items-center justify-start gap-2 px-2.5 py-2.5 text-sm font-medium",
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={CT_SIDE_ICON_SRC}
                              alt=""
                              className={cn(
                                "size-7 shrink-0 object-contain sm:size-8",
                                side === "ct"
                                  ? "opacity-100"
                                  : "opacity-70 group-hover:opacity-100",
                              )}
                              draggable={false}
                            />
                            <span className="min-w-0 leading-tight">CT</span>
                          </button>
                        </StaggeredAnimation>
                        <StaggeredAnimation
                          {...nadeRowStagger}
                          className="min-w-0 w-full"
                          index={1}
                        >
                          <WizardDetailOptionButton
                            selected={side === "both"}
                            onClick={() => setSide("both")}
                            icon={Users}
                            label="Both sides"
                            className="min-h-14 w-full"
                          />
                        </StaggeredAnimation>
                        <StaggeredAnimation
                          {...nadeRowStagger}
                          className="min-w-0 w-full"
                          index={2}
                        >
                          <button
                            type="button"
                            onClick={() => setSide("t")}
                            className={cn(
                              wizardLineupDetailTileClass(side === "t"),
                              "group flex min-h-14 w-full items-center justify-start gap-2 px-2.5 py-2.5 text-sm font-medium",
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={T_SIDE_ICON_SRC}
                              alt=""
                              className={cn(
                                "size-7 shrink-0 object-contain sm:size-8",
                                side === "t"
                                  ? "opacity-100"
                                  : "opacity-70 group-hover:opacity-100",
                              )}
                              draggable={false}
                            />
                            <span className="min-w-0 leading-tight">T</span>
                          </button>
                        </StaggeredAnimation>
                      </div>
                    </div>

                    {side !== null ? (
                      <div className="w-full min-w-0 space-y-2">
                        <Label
                          className={nadeDetailRowLabelClass(
                            nadeDetailActiveRow === "grenade",
                            prefersReducedMotion,
                          )}
                        >
                          Grenade type
                        </Label>
                        <ul
                          className="grid w-full min-w-0 grid-cols-4 gap-2"
                          role="list"
                        >
                          {GRENADE_TYPE_OPTIONS.map(
                            ({ value, label, icon }, i) => (
                              <li
                                key={value}
                                className="min-w-0 list-none [&>*]:w-full"
                              >
                                <StaggeredAnimation
                                  {...nadeRowStagger}
                                  className="min-w-0 w-full"
                                  index={i}
                                >
                                  <WizardDetailOptionButton
                                    selected={grenadeType === value}
                                    onClick={() => setGrenadeType(value)}
                                    icon={icon}
                                    label={label}
                                    className="w-full text-xs sm:text-sm"
                                  />
                                </StaggeredAnimation>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    ) : null}

                    {side !== null && grenadeType !== null ? (
                      <div className="w-full min-w-0 space-y-2">
                        <Label
                          className={nadeDetailRowLabelClass(
                            nadeDetailActiveRow === "movement",
                            prefersReducedMotion,
                          )}
                        >
                          Movement
                        </Label>
                        <ul
                          className="grid w-full min-w-0 grid-cols-5 gap-2"
                          role="list"
                        >
                          {MOVEMENT_OPTIONS.map(({ value, label, icon }, i) => (
                            <li
                              key={value}
                              className="min-w-0 list-none [&>*]:w-full"
                            >
                              <StaggeredAnimation
                                {...nadeRowStagger}
                                className="min-w-0 w-full"
                                index={i}
                              >
                                <WizardDetailOptionButton
                                  selected={movement === value}
                                  onClick={() => setMovement(value)}
                                  icon={icon}
                                  label={label}
                                  className="w-full text-[11px] leading-tight sm:text-xs"
                                  iconClassName="size-3.5 sm:size-4"
                                />
                              </StaggeredAnimation>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {side !== null &&
                    grenadeType !== null &&
                    movement !== null ? (
                      <div className="w-full min-w-0 space-y-2">
                        <div className="grid w-full min-w-0 grid-cols-5 gap-2">
                          <div className="col-span-2 min-w-0">
                            <Label
                              className={nadeDetailRowLabelClass(
                                nadeDetailActiveRow === "technique" &&
                                  techniqueJump === null,
                                prefersReducedMotion,
                              )}
                            >
                              Technique
                            </Label>
                          </div>
                          <div className="col-span-3 min-w-0">
                            <Label
                              className={nadeDetailRowLabelClass(
                                nadeDetailActiveRow === "technique" &&
                                  techniqueClick === null,
                                prefersReducedMotion,
                              )}
                            >
                              Click type
                            </Label>
                          </div>
                        </div>
                        <div className="grid w-full min-w-0 grid-cols-5 gap-2">
                          <StaggeredAnimation
                            {...nadeRowStagger}
                            className="min-w-0 w-full"
                            index={0}
                          >
                            <WizardDetailOptionButton
                              selected={techniqueJump === "standing"}
                              onClick={() => setTechniqueJump("standing")}
                              icon={Minus}
                              label="Standing"
                              className="w-full text-[11px] leading-tight sm:text-xs"
                              iconClassName="size-3.5 sm:size-4"
                            />
                          </StaggeredAnimation>
                          <StaggeredAnimation
                            {...nadeRowStagger}
                            className="min-w-0 w-full"
                            index={1}
                          >
                            <WizardDetailOptionButton
                              selected={techniqueJump === "jumping"}
                              onClick={() => setTechniqueJump("jumping")}
                              icon={ArrowBigUp}
                              label="Jumping"
                              className="w-full text-[11px] leading-tight sm:text-xs"
                              iconClassName="size-3.5 sm:size-4"
                            />
                          </StaggeredAnimation>
                          {(
                            [
                              {
                                choice: "left" as const,
                                label: "Left click",
                                icon: MousePointer2,
                              },
                              {
                                choice: "right" as const,
                                label: "Right click",
                                icon: MousePointerClick,
                              },
                              {
                                choice: "both" as const,
                                label: "Left + right",
                                icon: StretchHorizontal,
                              },
                            ] as const
                          ).map(({ choice, label, icon }, i) => (
                            <StaggeredAnimation
                              key={choice}
                              {...nadeRowStagger}
                              className="min-w-0 w-full"
                              index={2 + i}
                            >
                              <WizardDetailOptionButton
                                selected={techniqueClick === choice}
                                onClick={() => setTechniqueClick(choice)}
                                icon={icon}
                                label={label}
                                className="w-full text-[11px] leading-tight sm:text-xs"
                                iconClassName="size-3.5 sm:size-4"
                              />
                            </StaggeredAnimation>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {side !== null &&
                    grenadeType !== null &&
                    movement !== null &&
                    resolvedTechnique !== null ? (
                      <div className="w-full min-w-0 space-y-2">
                        <Label
                          className={nadeDetailRowLabelClass(
                            nadeDetailActiveRow === "margin",
                            prefersReducedMotion,
                          )}
                        >
                          Margin for error
                        </Label>
                        <div className="grid w-full min-w-0 grid-cols-3 gap-2">
                          {MARGIN_OPTIONS.map(({ value, label, icon }, i) => (
                            <StaggeredAnimation
                              key={value}
                              {...nadeRowStagger}
                              className="min-w-0 w-full"
                              index={i}
                            >
                              <WizardDetailOptionButton
                                selected={margin === value}
                                onClick={() => setMargin(value)}
                                icon={icon}
                                label={label}
                                className="w-full"
                              />
                            </StaggeredAnimation>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {stepIndex === STEP_INDEX_THROW ? (
                  <div className="flex w-full min-w-0 flex-col gap-6">
                    <div className="w-full min-w-0 space-y-2">
                      <Label className="text-xs font-normal text-muted-foreground">
                        Throw radar position
                      </Label>
                      <div className="flex w-full min-w-0 items-center gap-2">
                        <Button
                          type="button"
                          variant={throwNorm ? "default" : "outline"}
                          className="h-11 w-1/4 min-w-0 shrink-0 justify-center gap-2 px-2"
                          onClick={() => openThrowRadarForPick()}
                          disabled={enqueueLoading}
                        >
                          <Crosshair className="size-4 shrink-0" aria-hidden />
                          <span className="truncate">
                            {throwNorm
                              ? "Select new radar position"
                              : "Select on radar"}
                          </span>
                        </Button>
                        <Input
                          id="throw-label-display"
                          readOnly
                          value={throwLabel}
                          disabled
                          placeholder="Select position on radar first"
                          className="min-w-0 flex-1"
                          aria-label="Throw spot label"
                        />
                      </div>
                    </div>
                    {throwRadarPositionComplete ? (
                      <div className="w-full min-w-0 space-y-2">
                        <Label className="text-xs font-normal text-muted-foreground">
                          Video stills
                        </Label>
                        <div className="grid w-full min-w-0 grid-cols-3 gap-2 sm:gap-3">
                          {THROW_STILL_SLOTS.map(
                            ({ slot, marker, caption }) => (
                              <button
                                key={slot}
                                type="button"
                                aria-label={`${caption}. Click to choose or edit the freeze frame.`}
                                onClick={() => openThrowStillDialog(slot)}
                                disabled={enqueueLoading || !file}
                                className={cn(
                                  "flex min-w-0 flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 p-2 text-left transition-colors",
                                  "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                  "disabled:pointer-events-none disabled:opacity-50",
                                )}
                              >
                                <ThrowStillSlotTemplate
                                  videoUrl={filePreviewUrl}
                                  timeMs={timeline[marker]}
                                />
                                <span className="text-muted-foreground text-center text-[11px] leading-tight sm:text-xs">
                                  {caption}
                                </span>
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {stepIndex === STEP_INDEX_LAND ? (
                  <div className="flex flex-col gap-6">
                    <div className="w-full min-w-0 space-y-2">
                      <Label className="text-xs font-normal text-muted-foreground">
                        Land radar position
                      </Label>
                      <div className="flex w-full min-w-0 items-center gap-2">
                        <Button
                          type="button"
                          variant={landNorm ? "default" : "outline"}
                          className="h-11 w-1/4 min-w-0 shrink-0 justify-center gap-2 px-2"
                          onClick={() => openLandRadarForPick()}
                          disabled={enqueueLoading}
                        >
                          <MapPin className="size-4 shrink-0" aria-hidden />
                          <span className="truncate">
                            {landNorm
                              ? "Select new radar position"
                              : "Select on radar"}
                          </span>
                        </Button>
                        <Input
                          id="land-label-display"
                          readOnly
                          value={landLabel}
                          disabled
                          placeholder="Select position on radar first"
                          className="min-w-0 flex-1"
                          aria-label="Land spot label"
                        />
                      </div>
                    </div>
                    {landRadarPositionComplete ? (
                      <div className="w-full min-w-0 space-y-2">
                        <Label className="text-xs font-normal text-muted-foreground">
                          Video stills
                        </Label>
                        <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:gap-3">
                          {LAND_STILL_SLOTS.map(({ slot, marker, caption }) => (
                            <button
                              key={slot}
                              type="button"
                              aria-label={`${caption}. Click to choose or edit the freeze frame.`}
                              onClick={() => openLandStillDialog(slot)}
                              disabled={enqueueLoading || !file}
                              className={cn(
                                "flex min-w-0 flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 p-2 text-left transition-colors",
                                "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                "disabled:pointer-events-none disabled:opacity-50",
                              )}
                            >
                              <ThrowStillSlotTemplate
                                videoUrl={filePreviewUrl}
                                timeMs={timeline[marker]}
                              />
                              <span className="text-muted-foreground text-center text-[11px] leading-tight sm:text-xs">
                                {caption}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {stepIndex === STEP_INDEX_ENEMY_POV ? (
                  <div className="flex flex-col gap-4">
                    <Label
                      htmlFor="enemy-pov-video-file"
                      className="sr-only"
                    >
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
                          if (
                            !e.currentTarget.contains(e.relatedTarget as Node)
                          ) {
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
                            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                            <video
                              src={enemyPovFilePreviewUrl}
                              className="size-full object-contain"
                              controls
                              loop
                              muted
                              playsInline
                              preload="auto"
                              onLoadedMetadata={(e) => {
                                const ms = Math.round(
                                  e.currentTarget.duration * 1000,
                                );
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
                            onClick={() =>
                              enemyPovFileInputRef.current?.click()
                            }
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
                              {Math.floor(
                                MAX_UTILITY_LINEUP_VIDEO_BYTES / (1024 * 1024),
                              )}{" "}
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
                            onClick={() =>
                              enemyPovFileInputRef.current?.click()
                            }
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
                            onChange={(e) =>
                              setEnemyPovDescription(e.target.value)
                            }
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
                          When provided, the enemy POV uploads after your
                          lineup video and links automatically — same trim
                          rules, same size limits.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : null}

                {stepIndex === STEP_INDEX_REVIEW ? (
                  <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lineup-desc">Description</Label>
                      <Textarea
                        id="lineup-desc"
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="How to line this up, lineup name, tips…"
                      />
                    </div>
                  </div>
                ) : null}

                {stepErr && stepIndex !== STEP_INDEX_NADE_DETAILS ? (
                  <p className="text-muted-foreground mt-3 text-xs">
                    {stepErr}
                  </p>
                ) : null}
                {stepErr && stepIndex === STEP_INDEX_NADE_DETAILS ? (
                  <p className="sr-only" role="status">
                    {stepErr}
                  </p>
                ) : null}
              </ScrollArea>
            </div>

            <SheetFooter className="border-border mt-0 flex h-14 shrink-0 flex-row items-center justify-between gap-2 border-t p-0">
              <Button
                type="button"
                variant="outline"
                disabled={stepIndex === STEP_INDEX_CHOOSE_MAP || enqueueLoading}
                onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
              >
                Back
              </Button>
              <div className="flex gap-2">
                {stepIndex < STEP_LABELS.length - 1 ? (
                  <Button
                    type="button"
                    disabled={Boolean(validateStep(stepIndex))}
                    onClick={() =>
                      setStepIndex((s) =>
                        Math.min(STEP_LABELS.length - 1, s + 1),
                      )
                    }
                  >
                    {stepIndex === STEP_INDEX_ENEMY_POV && !enemyPovFile
                      ? "Skip"
                      : "Next"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={
                      Boolean(validateStep(stepIndex)) || enqueueLoading
                    }
                    onClick={() => void enqueue()}
                  >
                    {enqueueLoading ? "Queueing…" : "Add to upload queue"}
                  </Button>
                )}
              </div>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={radarDialogKind !== null}
        onOpenChange={(next) => {
          if (!next) closeRadarDialog();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {radarDialogKind === "throw"
                ? "Throw position"
                : radarDialogKind === "land"
                  ? "Land position"
                  : "Radar"}
            </DialogTitle>
            <DialogDescription>
              {radarDialogKind === "throw"
                ? "Click the map to place the pin. OK continues to name this spot."
                : radarDialogKind === "land"
                  ? "Your throw spot is shown with the animated path once you place the land pin — same as on the map. OK continues to name this spot."
                  : "Click the radar to place the pin, then confirm with OK."}
            </DialogDescription>
          </DialogHeader>
          <div
            role="presentation"
            className="relative w-full cursor-crosshair overflow-hidden rounded-md border border-border"
            onClick={onDialogRadarClick}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={dialogRadarImgRef}
              src={selectedMap?.radarImageUrl ?? initialRadarImageUrl}
              alt={`${selectedMap?.displayName ?? initialDisplayName} radar`}
              className="pointer-events-none block h-auto w-full max-h-[min(48vh,420px)] object-contain"
              draggable={false}
              onLoad={() => {
                recomputeDialogRadarLayout();
              }}
            />
            {radarDialogKind === "land" &&
            throwNorm &&
            pendingRadarNorm ? (
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
                        to { stroke-dashoffset: -2.2; }
                      }
                      .intradark-utility-throw-line {
                        stroke-dashoffset: 0;
                        animation: intradarkUtilityDashTravel 1.15s linear infinite;
                      }
                      @media (prefers-reduced-motion: reduce) {
                        .intradark-utility-throw-line { animation: none; }
                      }
                    `}
                    </style>
                  </defs>
                  {(() => {
                    const from = landRadarOverlaySvgPoint(
                      throwNorm.x,
                      throwNorm.y,
                    );
                    const to = landRadarOverlaySvgPoint(
                      pendingRadarNorm.x,
                      pendingRadarNorm.y,
                    );
                    const x1 = from.x;
                    const y1 = from.y;
                    const x2 = to.x;
                    const y2 = to.y;
                    const segLen = Math.hypot(x2 - x1, y2 - y1) || 0.01;
                    const pulseLen = Math.max(1.6, segLen * 0.13);
                    const gapLen = segLen * 2.75;
                    const travelPeriod = pulseLen + gapLen;
                    return (
                      <g>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={landRadarTravelPulseStroke(side)}
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
                          stroke={landRadarThrowLineStroke(side)}
                          strokeWidth={0.35}
                          strokeDasharray="1.2 1"
                          strokeLinecap="round"
                          opacity={0.88}
                        />
                      </g>
                    );
                  })()}
                </svg>
              </div>
            ) : null}
            {radarDialogKind === "land" &&
            throwNorm &&
            landRadarThrowPinStyle ? (
              <div
                className="pointer-events-none absolute z-10 flex h-0 w-0 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                style={landRadarThrowPinStyle}
              >
                {(() => {
                  const pal = throwRadarPinPalette(side);
                  return (
                    <>
                      <span
                        className={cn(
                          "pointer-events-none absolute inline-flex size-3 origin-center rounded-full border-2 border-solid bg-transparent animate-utility-radar-beacon-ring",
                          pal.ring,
                        )}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "pointer-events-none absolute inline-flex size-3 origin-center rounded-full border-2 border-solid bg-transparent animate-utility-radar-beacon-ring",
                          pal.ring,
                        )}
                        style={{ animationDelay: "1.05s" }}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "relative z-10 inline-flex size-3 shrink-0 rounded-full border-2",
                          pal.core,
                        )}
                      />
                    </>
                  );
                })()}
              </div>
            ) : null}
            {dialogPinOverlayStyle && radarDialogKind === "land" ? (
              <span
                className="border-background absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-sky-400 shadow"
                style={dialogPinOverlayStyle}
              />
            ) : null}
            {dialogPinOverlayStyle && radarDialogKind === "throw"
              ? (() => {
                  const pal = throwRadarPinPalette(side);
                  return (
                    <div
                      className="pointer-events-none absolute z-10 flex h-0 w-0 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                      style={dialogPinOverlayStyle}
                    >
                      <span
                        className={cn(
                          "pointer-events-none absolute inline-flex size-3 origin-center rounded-full border-2 border-solid bg-transparent animate-utility-radar-beacon-ring",
                          pal.ring,
                        )}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "pointer-events-none absolute inline-flex size-3 origin-center rounded-full border-2 border-solid bg-transparent animate-utility-radar-beacon-ring",
                          pal.ring,
                        )}
                        style={{ animationDelay: "1.05s" }}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "relative z-10 inline-flex size-3 shrink-0 rounded-full border-2",
                          pal.core,
                        )}
                      />
                    </div>
                  );
                })()
              : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={closeRadarDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!pendingRadarNorm}
              onClick={handleRadarDialogOk}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={throwSpotNamingOpen}
        onOpenChange={(next) => {
          if (!next) setThrowSpotNamingOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Name this throw spot</DialogTitle>
            <DialogDescription>
              What is the closest name you would use for this spot in-game? Use
              the callout or landmark players would recognize.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="throw-spot-label-draft" className="sr-only">
              Spot label
            </Label>
            <Input
              id="throw-spot-label-draft"
              value={throwSpotLabelDraft}
              onChange={(e) => setThrowSpotLabelDraft(e.target.value)}
              placeholder="e.g. Top mid, Dumpster, CT spawn"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter" && throwSpotLabelDraft.trim()) {
                  e.preventDefault();
                  handleThrowSpotNamingConfirm();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setThrowSpotNamingOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!throwSpotLabelDraft.trim()}
              onClick={handleThrowSpotNamingConfirm}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={landSpotNamingOpen}
        onOpenChange={(next) => {
          if (!next) setLandSpotNamingOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Name this land spot</DialogTitle>
            <DialogDescription>
              What is the closest name for where this utility lands? Use the
              callout or landmark players would recognize.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="land-spot-label-draft" className="sr-only">
              Land spot label
            </Label>
            <Input
              id="land-spot-label-draft"
              value={landSpotLabelDraft}
              onChange={(e) => setLandSpotLabelDraft(e.target.value)}
              placeholder="e.g. Back site, Default plant, Fountain"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter" && landSpotLabelDraft.trim()) {
                  e.preventDefault();
                  handleLandSpotNamingConfirm();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLandSpotNamingOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!landSpotLabelDraft.trim()}
              onClick={handleLandSpotNamingConfirm}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={throwStillDialogSlot !== null}
        onOpenChange={onThrowStillDialogOpenChange}
      >
        <DialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {throwStillDialogMeta?.title ?? "Pick a frame"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Pause the video with the player controls, nudge the timestamp if
              needed, then confirm. You will review a screenshot next.
            </DialogDescription>
          </DialogHeader>
          {throwStillDialogMeta && throwStillDialogSlot ? (
            <UtilityLineupVideoTimelineScrubber
              variant="single"
              singleMarkerKey={throwStillDialogMeta.marker}
              sectionDescription={throwStillPickDescription(
                throwStillDialogSlot,
                grenadeLabelForThrowStills,
              )}
              videoSrc={filePreviewUrl}
              values={timeline}
              setTimeline={setTimeline}
              disabled={enqueueLoading || !file}
              compactPickFrameControls
              hideSingleVariantHeading
              className="border-0 p-0 shadow-none"
            />
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onThrowStillDialogOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                !throwStillDialogMeta ||
                timeline[throwStillDialogMeta.marker] == null
              }
              onClick={proceedThrowStillToConfirm}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={throwStillConfirmSlot !== null}
        onOpenChange={onThrowStillConfirmOpenChange}
      >
        <DialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {throwStillConfirmMeta?.title
                ? `Confirm — ${throwStillConfirmMeta.title}`
                : "Confirm frame"}
            </DialogTitle>
            <DialogDescription>
              This is the freeze frame we&apos;ll use. If you&apos;re happy with
              it, click OK. Otherwise go back to choose a different moment.
            </DialogDescription>
          </DialogHeader>
          {throwStillConfirmMeta &&
          filePreviewUrl &&
          typeof timeline[throwStillConfirmMeta.marker] === "number" ? (
            <ThrowStillCapturedFrame
              videoUrl={filePreviewUrl}
              timeMs={timeline[throwStillConfirmMeta.marker]!}
            />
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onThrowStillConfirmOpenChange(false)}
            >
              Back
            </Button>
            <Button type="button" onClick={confirmThrowStillFinal}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={landStillDialogSlot !== null}
        onOpenChange={onLandStillDialogOpenChange}
      >
        <DialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {landStillDialogMeta?.title ?? "Pick a frame"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Pause the video with the player controls, nudge the timestamp if
              needed, then confirm. You will review a screenshot next.
            </DialogDescription>
          </DialogHeader>
          {landStillDialogMeta && landStillDialogSlot ? (
            <UtilityLineupVideoTimelineScrubber
              variant="single"
              singleMarkerKey={landStillDialogMeta.marker}
              sectionDescription={landStillPickDescription(
                landStillDialogSlot,
                grenadeLabelForThrowStills,
              )}
              videoSrc={filePreviewUrl}
              values={timeline}
              setTimeline={setTimeline}
              disabled={enqueueLoading || !file}
              compactPickFrameControls
              hideSingleVariantHeading
              className="border-0 p-0 shadow-none"
            />
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onLandStillDialogOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                !landStillDialogMeta ||
                timeline[landStillDialogMeta.marker] == null
              }
              onClick={proceedLandStillToConfirm}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={landStillConfirmSlot !== null}
        onOpenChange={onLandStillConfirmOpenChange}
      >
        <DialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {landStillConfirmMeta?.title
                ? `Confirm — ${landStillConfirmMeta.title}`
                : "Confirm frame"}
            </DialogTitle>
            <DialogDescription>
              This is the freeze frame we&apos;ll use. If you&apos;re happy with
              it, click OK. Otherwise go back to choose a different moment.
            </DialogDescription>
          </DialogHeader>
          {landStillConfirmMeta &&
          filePreviewUrl &&
          typeof timeline[landStillConfirmMeta.marker] === "number" ? (
            <ThrowStillCapturedFrame
              videoUrl={filePreviewUrl}
              timeMs={timeline[landStillConfirmMeta.marker]!}
            />
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onLandStillConfirmOpenChange(false)}
            >
              Back
            </Button>
            <Button type="button" onClick={confirmLandStillFinal}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard upload wizard?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Closing will discard this lineup draft
              (nothing is queued yet).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAbandon}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
