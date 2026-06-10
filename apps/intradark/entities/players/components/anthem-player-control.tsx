"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Music2, Pause, Play } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import { OverflowMarqueeText } from "@/components/atoms/overflow-marquee-text";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useAnthemPlayer } from "@/entities/players/components/anthem-player-provider";

/** How long the social anthem chip stays fully expanded on first playback. */
const ANTHEM_INTRO_MS = 5_000;
/** Wait after the chip mounts before the page-load intro expansion. */
const ANTHEM_INTRO_DELAY_MS = 3_000;
/** Keep expanded briefly after manual play when the pointer leaves. */
const ANTHEM_MANUAL_PLAY_LINGER_MS = 2_000;
const CHIP_EXPAND_IN_MS = 400;
/** Collapse runs slower than expand for a softer tuck-in. */
const CHIP_EXPAND_OUT_MS = 1_200;

const chipExpandEase =
  "ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";

function chipShellTransition(isExpanded: boolean) {
  return cn(
    "transition-[max-width,width,background-color,box-shadow,backdrop-filter]",
    chipExpandEase,
    isExpanded ? "duration-[400ms]" : "duration-[1200ms]",
  );
}

function chipClipTransition(isExpanded: boolean) {
  return cn(
    "transition-[max-width,opacity]",
    chipExpandEase,
    isExpanded ? "duration-[400ms]" : "duration-[1200ms]",
  );
}

function chipTextTransition(isExpanded: boolean) {
  return cn(
    "transition-[opacity,transform] ease-out motion-reduce:transition-none",
    isExpanded ? "duration-200" : "duration-[600ms]",
  );
}
const expandedMaxW = "max-w-[min(10.625rem,calc(100vw-3rem))]";
const expandedShell = `${expandedMaxW} bg-black/80 shadow-lg shadow-black/30 backdrop-blur-md`;

/** Faux equalizer (5 bars) — decorative; real audio is inside a cross-origin iframe. */
function Equalizer({ compact }: { compact: boolean }) {
  const { isPlaying } = useAnthemPlayer();
  // Per-bar delay + duration. Negative delays start mid-cycle and the varied
  // durations keep the bars out of phase so it reads as random, not synced.
  const bars = [
    { delay: "-340ms", duration: "0.52s" },
    { delay: "-80ms", duration: "0.43s" },
    { delay: "-470ms", duration: "0.61s" },
    { delay: "-200ms", duration: "0.38s" },
    { delay: "-30ms", duration: "0.55s" },
  ];
  return (
    <span
      className={cn(
        "flex items-center justify-center gap-[2px]",
        compact ? "h-3" : "h-3.5",
      )}
      aria-hidden
    >
      {bars.map((bar, i) => (
        <span
          key={i}
          className={cn(
            "w-[2px] origin-center rounded-full bg-current",
            compact ? "h-3" : "h-3.5",
            isPlaying
              ? "motion-safe:animate-equalize-bar motion-reduce:scale-y-50"
              : "scale-y-50",
          )}
          style={{ animationDelay: bar.delay, animationDuration: bar.duration }}
        />
      ))}
    </span>
  );
}

/**
 * Vinyl-style disc: the artwork spins, and a static centre label carries the
 * SoundCloud logo (the label does NOT spin). Disc spins only while playing;
 * pausing the animation keeps the current rotation rather than snapping to 0.
 */
function VinylDisc({
  compact,
  social = false,
}: {
  compact: boolean;
  /** Smaller disc for the social-column expanded chip (dark background). */
  social?: boolean;
}) {
  const { isPlaying, artwork } = useAnthemPlayer();
  const spin = cn(
    "h-full w-full rounded-full object-cover ring-1 ring-inset motion-safe:animate-[spin_8s_linear_infinite]",
    social ? "ring-white/25" : "ring-border",
    !isPlaying && "[animation-play-state:paused]",
  );

  return (
    <div
      className={cn(
        "relative shrink-0",
        social ? "size-6" : compact ? "size-8" : "size-11",
      )}
    >
      {artwork ? (
        // eslint-disable-next-line @next/next/no-img-element -- external sndcdn host, not configured for next/image
        <img src={artwork} alt="" className={spin} />
      ) : (
        <div
          className={cn(
            spin,
            "grid place-items-center",
            social ? "bg-white/10" : "bg-muted",
          )}
        >
          <Music2
            className={cn(
              social ? "size-2.5 text-white/60" : "text-muted-foreground",
              !social && (compact ? "size-3" : "size-4"),
            )}
            aria-hidden
          />
        </div>
      )}
      {/* Static SoundCloud "vinyl label" — does not rotate with the artwork. */}
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-full bg-[#ff5500]",
          social ? "ring-2 ring-black/80" : "ring-2 ring-background",
          social ? "size-2.5" : compact ? "size-3.5" : "size-5",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local static asset */}
        <img
          src="/images/logos/soundcloud-logo.svg"
          alt="SoundCloud"
          className="w-[72%]"
        />
      </span>
    </div>
  );
}

function SocialAnthemTrackLine({
  text,
  className,
  showIntroDetails,
  isExpanded,
  variant,
}: {
  text: string;
  className: string;
  showIntroDetails: boolean;
  isExpanded: boolean;
  variant: "title" | "artist";
}) {
  const hiddenOffset =
    variant === "title" ? "-translate-y-1.5" : "translate-y-1.5";
  const revealDelayClass =
    variant === "title"
      ? "[transition-delay:240ms]"
      : "[transition-delay:300ms]";

  return (
    <div
      className={cn(
        chipTextTransition(isExpanded),
        showIntroDetails || isExpanded
          ? cn("translate-y-0 opacity-100", revealDelayClass)
          : cn(hiddenOffset, "translate-y-0 opacity-0 delay-0"),
      )}
    >
      <OverflowMarqueeText text={text} className={className} />
    </div>
  );
}

/** Single social-chip row: lead control, vinyl, and text share one expansion block. */
function SocialAnthemChip({
  isPlaying,
  showIntroDetails,
  isExpanded,
  title,
  artist,
  onToggle,
  iconSize,
}: {
  isPlaying: boolean;
  showIntroDetails: boolean;
  isExpanded: boolean;
  title: string | null;
  artist: string | null;
  onToggle: () => void;
  iconSize: string;
}) {
  const leadClip = isPlaying
    ? "max-w-9 opacity-100"
    : isExpanded
      ? "max-w-9 opacity-100"
      : "max-w-0 opacity-0";

  const vinylClip = !isPlaying
    ? "max-w-9 opacity-100"
    : isExpanded
      ? "max-w-9 opacity-100"
      : "max-w-0 opacity-0";

  const textClip = isExpanded
    ? "max-w-[7.25rem] opacity-100"
    : "max-w-0 opacity-0";

  const controlLabel = isPlaying ? "Pause anthem" : "Play anthem";

  return (
    <div className="flex min-w-0 items-stretch">
      <div
        className={cn(
          "grid shrink-0 overflow-hidden",
          chipClipTransition(isExpanded),
          leadClip,
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label={controlLabel}
          title={title || "Anthem"}
          className={cn(
            "group/anthem-social flex size-8 shrink-0 items-center justify-center rounded-md transition-colors sm:size-9",
            isPlaying
              ? "text-emerald-300 hover:bg-white/10 hover:text-emerald-200"
              : "text-white/70 hover:bg-white/10 hover:text-emerald-200",
          )}
        >
          {isPlaying ? (
            <>
              <span className="group-hover/anthem-social:hidden">
                <Equalizer compact={true} />
              </span>
              <Pause
                className={cn(
                  "hidden group-hover/anthem-social:block",
                  iconSize,
                )}
                aria-hidden
              />
            </>
          ) : (
            <Play className={cn("translate-x-px", iconSize)} aria-hidden />
          )}
        </button>
      </div>

      <div
        className={cn(
          "grid shrink-0 overflow-hidden",
          chipClipTransition(isExpanded),
          vinylClip,
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label={controlLabel}
          title={title || "Anthem"}
          className="flex size-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/10 sm:size-9"
        >
          <VinylDisc compact social />
        </button>
      </div>

      <div
        className={cn(
          "flex min-w-0 overflow-hidden",
          chipClipTransition(isExpanded),
          textClip,
        )}
      >
        <div className="flex w-[7rem] min-w-0 flex-col justify-center overflow-hidden py-0.5 pl-1.5 pr-2 text-left">
          {title ? (
            <SocialAnthemTrackLine
              text={title}
              variant="title"
              showIntroDetails={showIntroDetails}
              isExpanded={isExpanded}
              className="text-[10px] font-semibold leading-tight text-white sm:text-[11px]"
            />
          ) : null}
          {artist ? (
            <SocialAnthemTrackLine
              text={artist}
              variant="artist"
              showIntroDetails={showIntroDetails}
              isExpanded={isExpanded}
              className="text-[9px] leading-tight text-white/60 sm:text-[10px]"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Social-column play control. One expansion block clips lead / vinyl / text in
 * and out. Paused idle: vinyl only. Playing tucked: equalizer only. Intro or
 * hover: full chip with staggered title and artist.
 */
function SocialAnthemButton() {
  const { isPlaying, title, artist, toggle } = useAnthemPlayer();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [introExpanded, setIntroExpanded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [lingerExpanded, setLingerExpanded] = useState(false);
  const introPlayedRef = useRef(false);
  const lingerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lingerExpandedRef = useRef(false);
  const iconSize = "size-4 sm:size-[1.125rem]";

  const clearLingerTimer = useCallback(() => {
    if (lingerTimerRef.current) {
      clearTimeout(lingerTimerRef.current);
      lingerTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (introPlayedRef.current || prefersReducedMotion) {
      return;
    }

    const expandTimer = setTimeout(() => {
      introPlayedRef.current = true;
      setIntroExpanded(true);
    }, ANTHEM_INTRO_DELAY_MS);

    const collapseTimer = setTimeout(() => {
      setIntroExpanded(false);
    }, ANTHEM_INTRO_DELAY_MS + ANTHEM_INTRO_MS);

    return () => {
      clearTimeout(expandTimer);
      clearTimeout(collapseTimer);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!isPlaying) {
      lingerExpandedRef.current = false;
      setLingerExpanded(false);
      clearLingerTimer();
    }
  }, [clearLingerTimer, isPlaying]);

  useEffect(() => () => clearLingerTimer(), [clearLingerTimer]);

  const showIntroDetails = introExpanded;
  const isExpanded = showIntroDetails || isHovering || lingerExpanded;

  const handleMouseEnter = useCallback(() => {
    clearLingerTimer();
    setIsHovering(true);
  }, [clearLingerTimer]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    if (!lingerExpandedRef.current) {
      return;
    }
    clearLingerTimer();
    lingerTimerRef.current = setTimeout(() => {
      lingerExpandedRef.current = false;
      setLingerExpanded(false);
      lingerTimerRef.current = null;
    }, ANTHEM_MANUAL_PLAY_LINGER_MS);
  }, [clearLingerTimer]);

  const handleToggle = useCallback(() => {
    if (!isPlaying) {
      if (showIntroDetails || isHovering || lingerExpandedRef.current) {
        lingerExpandedRef.current = true;
        setLingerExpanded(true);
      }
    } else {
      lingerExpandedRef.current = false;
      setLingerExpanded(false);
      clearLingerTimer();
    }
    toggle();
  }, [clearLingerTimer, isHovering, isPlaying, showIntroDetails, toggle]);

  return (
    <div className="relative h-8 w-8 shrink-0 overflow-visible sm:h-9 sm:w-9">
      <div
        className={cn(
          "group/anthem-expand absolute left-0 top-0 z-10 flex h-8 items-stretch overflow-hidden rounded-md sm:h-9",
          chipShellTransition(isExpanded),
          isExpanded
            ? cn("w-fit", expandedShell)
            : cn(
                "max-w-8 bg-transparent sm:max-w-9",
                isPlaying ? "w-fit" : "w-8 sm:w-9",
              ),
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <SocialAnthemChip
          isPlaying={isPlaying}
          showIntroDetails={showIntroDetails}
          isExpanded={isExpanded}
          title={title}
          artist={artist}
          onToggle={handleToggle}
          iconSize={iconSize}
        />
      </div>
    </div>
  );
}

/**
 * Background-less play/pause control to the left of the disc. When playing it
 * shows an animated equalizer by default and swaps to a pause icon on group
 * hover; when paused it shows a play icon. The icon/bars use the accent colour.
 */
function PlayButton({
  compact,
  accentColor,
}: {
  compact: boolean;
  accentColor: string;
}) {
  const { isPlaying, title, toggle } = useAnthemPlayer();
  const iconSize = compact ? "size-4" : "size-5";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isPlaying ? "Pause anthem" : "Play anthem"}
      title={title || "Anthem"}
      className={cn(
        "grid shrink-0 place-items-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40",
        compact ? "size-6" : "size-7",
      )}
      style={{ color: accentColor }}
    >
      {isPlaying ? (
        <>
          <span className="group-hover:hidden">
            <Equalizer compact={compact} />
          </span>
          <Pause
            className={cn("hidden group-hover:block", iconSize)}
            aria-hidden
          />
        </>
      ) : (
        <Play className={cn("translate-x-px", iconSize)} aria-hidden />
      )}
    </button>
  );
}

interface AnthemPlayerControlProps {
  /** "card" = profile row; "compact" = app header; "social" = social column icon. */
  variant: "card" | "compact" | "social";
  /** Play-button colour; defaults to the Intradark blue. */
  accentColor?: string;
}

/**
 * Renders a controller for the shared anthem player: play/pause button, a
 * spinning vinyl disc, and the track title + artist. Returns null when no
 * (controllable) anthem is registered, so it's safe to mount globally.
 */
export function AnthemPlayerControl({
  variant,
  accentColor = "#0483c8",
}: AnthemPlayerControlProps) {
  const { hasAnthem, title, artist, cardVisible } = useAnthemPlayer();
  if (!hasAnthem) return null;
  // Only the app-header mini control hides while the profile social icon is on screen.
  if (variant === "compact" && cardVisible) return null;

  if (variant === "social") {
    return <SocialAnthemButton />;
  }

  const compact = variant === "compact";

  return (
    <div
      className={cn(
        "group flex items-center",
        compact ? "gap-2" : "w-full gap-2.5",
      )}
    >
      <PlayButton compact={compact} accentColor={accentColor} />
      <VinylDisc compact={compact} />
      {title || artist ? (
        <div className={cn("min-w-0", compact ? "max-w-[10rem]" : "flex-1")}>
          {title ? (
            <p
              className={cn(
                "truncate font-semibold leading-tight text-foreground",
                compact ? "text-xs" : "text-sm",
              )}
            >
              {title}
            </p>
          ) : null}
          {artist ? (
            <p
              className={cn(
                "truncate leading-tight text-muted-foreground",
                compact ? "text-[11px]" : "text-xs",
              )}
            >
              {artist}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
