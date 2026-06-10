"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Instagram, Loader2 } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import { Separator } from "@workspace/ui/components/separator";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { GoldVerifiedBadge } from "@/components/atoms/gold-verified-badge";
import { FaceitElo } from "@/components/organisms/faceit-elo";
import { PremierEloBadge } from "@/components/atoms/premier-elo-badge";
import { ProStatusBadge } from "@/components/atoms/pro-status-badge";
import { CountryFlag } from "@/entities/players/components/country-flag";
import { AnthemPanel } from "@/entities/players/components/panels/anthem-panel";
import { VeritasSummary } from "@/entities/players/components/veritas-summary";
import { anthemProvider } from "@/entities/players/lib/anthem";
import {
  listProfileSocialLinks,
  type PlayerSocialLinks,
} from "@/entities/players/lib/social-links";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";

/**
 * Entrance choreography for the header. Each layer emerges from behind a clip
 * edge on its own beat, staggered by {@link STAGGER_MS}. Directions mirror the
 * former slide-fade animations (up → bottom, down → top, left, right).
 */
const STAGGER_MS = 250;
const BEHIND_WALL_DURATION_S = 0.55;
/** Player alias entrance runs at 2× the default wall duration. */
const ALIAS_BEHIND_WALL_DURATION_S = BEHIND_WALL_DURATION_S * 2;
type WallDirection = "bottom" | "top" | "left" | "right";

const WALL_ANIMATION: Record<WallDirection, string> = {
  bottom: "animate-emerge-behind-wall-bottom",
  top: "animate-emerge-behind-wall-top",
  left: "animate-emerge-behind-wall-left",
  right: "animate-emerge-behind-wall-right",
};

const SLIDE_FADE_ANIMATION: Record<WallDirection, string> = {
  bottom: "animate-slide-up-fade-in-slow",
  top: "animate-slide-down-fade-in-slow",
  left: "animate-slide-left-fade-in-slow",
  right: "animate-slide-right-fade-in-slow",
};
const SLIDE_FADE_DURATION_S = 0.5;
/** Per-icon delay in the social column (twitch → … → anthem). */
const SOCIAL_ICON_STAGGER_S = 0.075;

/**
 * Fixed hero height — single source of truth for the shell, loading placeholder,
 * and flex children. Passed as `--player-header-height` so nested regions can
 * derive from the same cap without duplicating magic numbers.
 */
const HEADER_HEIGHT = "240px";

const headerShellClassName =
  "relative z-[1] mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-transparent lg:mx-0 lg:max-w-none";

function headerShellStyle(): React.CSSProperties {
  return {
    "--player-header-height": HEADER_HEIGHT,
    height: "var(--player-header-height)",
  } as React.CSSProperties;
}

const STEP = {
  card: 0,
  border: 1,
  glow: 2,
  /** Avatar + spinning team / Intradark star share a beat. */
  avatar: 3,
  /** Player name rises from behind a clip edge; social icons from the right. */
  alias: 4,
  social: 4,
  fullName: 5,
  roleTeam: 6,
  stats: 7,
} as const;

/** Wall-clock time for the header's staggered entrance to finish. */
export function getHeaderRevealDurationMs(
  prefersReducedMotion: boolean,
): number {
  if (prefersReducedMotion) return 0;
  return STEP.stats * STAGGER_MS + BEHIND_WALL_DURATION_S * 1000;
}

/**
 * Header "theme": the background watermark logo + the glow colour. These will
 * eventually be derived from the player's team; until then they fall back to
 * the Intradark brand (blue glow + Intradark star).
 */
const DEFAULT_THEME = {
  accentColor: "#00497d", // intradark blue
  logoSrc: "/images/logos/intradark-symbol-blue.svg",
} as const;

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * TODO(team-db): team and role are still placeholder content until the team
 * schema exists.
 */
const PLACEHOLDER = {
  role: "Rifler",
  roleIconSrc: "/images/icons/ak47-icon-white.svg",
  teamName: "Falcons",
  teamLogoSrc: "/images/teams/falcons-logo.png",
} as const;

function steamProfileUrl(steamid64: string): string {
  return `https://steamcommunity.com/profiles/${steamid64}`;
}

function TwitchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function SteamIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 88.32 88.47"
      fill="currentColor"
      aria-hidden
    >
      <path d="M44.08,0C20.85,0,1.81,17.92,0,40.69l23.71,9.8c2.01-1.37,4.44-2.18,7.05-2.18.23,0,.47,0,.7.02l10.54-15.28v-.22c0-9.2,7.48-16.68,16.68-16.68s16.68,7.48,16.68,16.68-7.48,16.68-16.68,16.68c-.13,0-.25,0-.38,0l-15.04,10.73c0,.19.01.39.01.59,0,6.91-5.62,12.52-12.52,12.52-6.06,0-11.13-4.33-12.28-10.06L1.52,56.29c5.25,18.57,22.31,32.18,42.56,32.18,24.43,0,44.24-19.81,44.24-44.24S68.51,0,44.08,0" />
      <path d="M27.72,67.12l-5.43-2.25c.96,2,2.63,3.68,4.84,4.61,4.78,1.99,10.3-.28,12.29-5.06.97-2.31.97-4.87.01-7.19-.96-2.32-2.76-4.13-5.07-5.1-2.3-.96-4.76-.92-6.93-.1l5.61,2.32c3.53,1.47,5.19,5.52,3.72,9.05-1.47,3.53-5.52,5.2-9.05,3.72" />
      <path d="M69.8,32.84c0-6.13-4.99-11.12-11.12-11.12s-11.12,4.99-11.12,11.12,4.99,11.11,11.12,11.11,11.12-4.99,11.12-11.11M50.35,32.82c0-4.61,3.74-8.35,8.35-8.35s8.35,3.74,8.35,8.35-3.74,8.35-8.35,8.35-8.35-3.74-8.35-8.35" />
    </svg>
  );
}

const SOCIAL_LINK_CLASS =
  "flex size-8 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-emerald-200 sm:size-9";

const SOCIAL_ICON_CLASS = "size-4 sm:size-[1.125rem]";

function SocialIcon({
  kind,
  className,
}: {
  kind: "twitch" | "x" | "instagram";
  className?: string;
}) {
  const iconClass = className ?? "size-5";
  switch (kind) {
    case "twitch":
      return <TwitchIcon className={iconClass} />;
    case "x":
      return <XIcon className={iconClass} />;
    case "instagram":
      return <Instagram className={iconClass} aria-hidden />;
  }
}

export interface PlayerHeaderProps {
  /** Big display name: intradark username, falling back to the Steam persona. */
  name: string;
  /** Secondary line under the name ("First Last"); hidden when null/empty. */
  subtitle: string | null;
  /** ISO 3166-1 alpha-2 code shown beside the subtitle (e.g. AU, NZ). */
  countryFlag?: string | null;
  /** Steam avatar URL; falls back to initials when missing. */
  avatarSrc: string | null;
  /** SteamID64 for the Steam community profile link in the social column. */
  steamid64: string;
  /** Whether the player has a linked intradark account (drives verified badge). */
  isMember: boolean;
  /**
   * TODO(team-db): glow colour + watermark logo. Default to the Intradark brand
   * until they can be derived from the player's team.
   */
  accentColor?: string;
  teamLogoSrc?: string;
  /**
   * Gates the staggered entrance: while false the header shows a loading
   * placeholder (used to wait for the SoundCloud anthem to be ready). When it
   * flips true the layers reveal in sequence.
   */
  start?: boolean;
  /** Fires once the staggered entrance animation has finished. */
  onRevealComplete?: () => void;
  /** Latest Premier CS Rating from the Leetify snapshot; hidden when null. */
  premierRating?: number | null;
  /** HLTV match history flags from Leetify games[]. */
  csgoPro?: boolean;
  cs2Pro?: boolean;
  /** Member-set social links from user_profiles; icons hidden when unset. */
  socialLinks?: PlayerSocialLinks;
  /** Canonical anthem URL (Spotify or SoundCloud); null when unset. */
  anthemUrl?: string | null;
  /** Whether the current viewer owns this profile (gates the anthem editor). */
  isOwner?: boolean;
}

export function PlayerHeader({
  name,
  subtitle,
  countryFlag = null,
  avatarSrc,
  steamid64,
  isMember,
  accentColor = DEFAULT_THEME.accentColor,
  teamLogoSrc = DEFAULT_THEME.logoSrc,
  start = true,
  onRevealComplete,
  premierRating = null,
  csgoPro = false,
  cs2Pro = false,
  socialLinks,
  anthemUrl = null,
  isOwner = false,
}: PlayerHeaderProps) {
  const initials = name.slice(0, 2).toUpperCase();
  const prefersReducedMotion = usePrefersReducedMotion();
  const hasAnthemSocial = !!anthemProvider(anthemUrl) || isOwner;
  const profileSocialLinks = listProfileSocialLinks(
    socialLinks ?? { twitchUrl: null, xUrl: null, instagramUrl: null },
  );

  useEffect(() => {
    if (!start || !onRevealComplete) return;
    const ms = getHeaderRevealDurationMs(prefersReducedMotion);
    if (ms === 0) {
      onRevealComplete();
      return;
    }
    const t = setTimeout(onRevealComplete, ms);
    return () => clearTimeout(t);
  }, [start, prefersReducedMotion, onRevealComplete]);

  /**
   * Clip + emerge from behind a wall edge (no opacity fade). Direction maps to
   * the former slide-fade animation for each layer.
   */
  const revealBehindWall = (
    step: number,
    direction: WallDirection,
    options?: {
      durationS?: number;
      clipClassName?: string;
      innerClassName?: string;
    },
  ): {
    clipClassName: string;
    innerClassName: string;
    innerStyle?: React.CSSProperties;
  } => {
    const durationS = options?.durationS ?? BEHIND_WALL_DURATION_S;
    if (prefersReducedMotion) {
      return {
        clipClassName: options?.clipClassName ?? "",
        innerClassName: options?.innerClassName ?? "",
      };
    }
    return {
      clipClassName: cn("overflow-hidden", options?.clipClassName),
      innerClassName: cn(options?.innerClassName, WALL_ANIMATION[direction]),
      innerStyle: {
        animationDelay: `${((step * STAGGER_MS) / 1000).toFixed(2)}s`,
        animationDuration: `${durationS}s`,
        animationFillMode: "both",
      },
    };
  };

  /** Slide + opacity entrance (avatar only; avoids clip sizing issues). */
  const revealSlideFade = (
    step: number,
    direction: WallDirection,
    options?: { className?: string; durationS?: number },
  ): { className: string; style?: React.CSSProperties } => {
    const durationS = options?.durationS ?? SLIDE_FADE_DURATION_S;
    if (prefersReducedMotion) {
      return { className: options?.className ?? "" };
    }
    return {
      className: cn(
        "opacity-0",
        SLIDE_FADE_ANIMATION[direction],
        options?.className,
      ),
      style: {
        animationDelay: `${((step * STAGGER_MS) / 1000).toFixed(2)}s`,
        animationDuration: `${durationS}s`,
        animationFillMode: "both",
      },
    };
  };

  // Hold the layout until the reveal is allowed to start so we don't flash an
  // un-animated header (and so the anthem has a beat to load).
  if (!start) {
    return (
      <header
        className={cn(headerShellClassName, "flex items-center justify-center")}
        style={headerShellStyle()}
        aria-busy
      >
        <Loader2 className="size-6 animate-spin text-white/30" aria-hidden />
        <span className="sr-only">Loading profile…</span>
      </header>
    );
  }

  const card = revealBehindWall(STEP.card, "bottom", {
    clipClassName:
      "overflow-x-visible overflow-y-hidden border-b-1.5px border-white/10",
  });
  const star = revealSlideFade(STEP.avatar, "bottom", {
    className:
      "pointer-events-none absolute bottom-0 left-0 top-0 z-0 w-[min(240%,28rem)] -translate-x-[22%] sm:w-[min(225%,30rem)] sm:-translate-x-[18%] md:w-[min(205%,32rem)] md:-translate-x-[14%] lg:w-[min(190%,34rem)] lg:-translate-x-[10%]",
  });
  const border = revealBehindWall(STEP.border, "bottom", {
    clipClassName:
      "pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-1.5px ",
  });
  const glow = revealBehindWall(STEP.glow, "bottom", {
    clipClassName: "pointer-events-none absolute inset-0 z-[1]",
  });
  const avatar = revealSlideFade(STEP.avatar, "bottom", {
    className:
      "relative z-[2] flex h-full min-h-0 w-[7.75rem] shrink-0 items-center justify-center sm:w-36 md:w-44 lg:w-52",
  });
  const alias = revealBehindWall(STEP.alias, "bottom", {
    durationS: ALIAS_BEHIND_WALL_DURATION_S,
    clipClassName: "min-w-0",
    innerClassName: "flex min-w-0 flex-wrap items-start gap-2",
  });
  const socialBaseDelayS = (STEP.social * STAGGER_MS) / 1000;
  const fullName = revealBehindWall(STEP.fullName, "top", {
    innerClassName:
      "inline-flex items-center gap-2 text-sm text-white/75 sm:text-base",
  });
  const roleTeam = revealBehindWall(STEP.roleTeam, "left", {
    innerClassName: "flex flex-col gap-2",
  });
  const stats = revealBehindWall(STEP.stats, "bottom", {
    innerClassName: "flex flex-col gap-2",
  });

  const veritasLayoutClass = cn(
    "w-full min-w-0 border-t border-white/10 pt-4 md:w-1/4 md:min-w-[12rem] md:max-w-[18rem] md:shrink-0 md:self-end md:border-l md:border-t-0 md:border-white/10 md:pt-0 md:pl-4 lg:pl-5",
  );
  const veritasSummary = revealSlideFade(STEP.stats, "right", {
    className: veritasLayoutClass,
  });

  // Hold count-ups until the stats row has finished emerging.
  const countUpDelay = prefersReducedMotion
    ? 0
    : (STEP.stats * STAGGER_MS) / 1000 + BEHIND_WALL_DURATION_S;

  return (
    <header
      className={cn(headerShellClassName, "overflow-x-visible overflow-y-hidden")}
      style={headerShellStyle()}
    >
      <div className={cn(card.clipClassName, "h-full min-h-0")}>
        <div
          className={cn(card.innerClassName, "relative h-full min-h-0")}
          style={card.innerStyle}
        >
          {/* Bottom border: drawn in as its own beat after the card shell. */}
          <div className={border.clipClassName} aria-hidden>
            <div
              className={cn(border.innerClassName, "h-0.5 bg-[#0483c8]")}
              style={border.innerStyle}
            />
          </div>
          {/* Gradient glow: emerge wrapper; inner layer keeps the idle breathe. */}
          <div className={glow.clipClassName} aria-hidden>
            <div
              className={cn(glow.innerClassName, "absolute inset-0")}
              style={glow.innerStyle}
            >
              <div
                className="absolute inset-0 motion-safe:animate-glow-breathe"
                style={{
                  backgroundImage: `linear-gradient(to top, ${hexToRgba(accentColor, 0.6)}, ${hexToRgba(accentColor, 0.06)}, transparent)`,
                }}
              />
            </div>
          </div>
          <div className="relative z-[2] flex h-full min-h-0 w-full min-w-0 flex-row items-stretch overflow-hidden">
            <div className="relative flex h-full min-h-0 shrink-0 overflow-visible pl-3 sm:pl-4 md:pl-5">
              {/* Intradark star / team watermark — slides up with the avatar (no
              overflow clip; the star extends left of the avatar column). */}
              <div className={star.className} style={star.style} aria-hidden>
                <div
                  className="absolute inset-0"
                  style={{
                    WebkitMaskImage:
                      "linear-gradient(to bottom, #000 0%, #000 12%, rgba(0,0,0,0.75) 38%, rgba(0,0,0,0.25) 68%, transparent 100%)",
                    maskImage:
                      "linear-gradient(to bottom, #000 0%, #000 12%, rgba(0,0,0,0.75) 38%, rgba(0,0,0,0.25) 68%, transparent 100%)",
                    WebkitMaskSize: "100% 100%",
                    maskSize: "100% 100%",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                  }}
                >
                  {/* Square wrapper holds the position; the image spins around its
                  own centre (one revolution / 60s). Keeping translate on the
                  wrapper avoids clashing with the rotate transform. */}
                  <div className="absolute left-0 -top-[12%] aspect-square h-[124%]">
                    <Image
                      src={teamLogoSrc}
                      alt=""
                      fill
                      className="object-contain opacity-[0.5] motion-safe:animate-[spin_60s_linear_infinite]"
                      sizes="(max-width: 640px) 320px, (max-width: 1024px) 384px, 448px"
                    />
                  </div>
                </div>
              </div>
              {/* Steam is always shown; member social links only when set on user_profiles. */}
              <div className="relative z-[3] shrink-0 self-center overflow-visible">
                <nav
                  className="flex flex-col items-center justify-center gap-1 overflow-visible pr-2 sm:gap-1.5 sm:pr-3"
                  aria-label="Social links"
                >
                  <StaggeredAnimation
                    index={0}
                    chainFromZero
                    baseDelay={socialBaseDelayS}
                    incrementDelay={SOCIAL_ICON_STAGGER_S}
                    fadeDirection="right"
                    reducedMotion={prefersReducedMotion}
                  >
                    <Link
                      href={steamProfileUrl(steamid64)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={SOCIAL_LINK_CLASS}
                    >
                      <span className="sr-only">Steam profile</span>
                      <SteamIcon className={SOCIAL_ICON_CLASS} />
                    </Link>
                  </StaggeredAnimation>
                  {profileSocialLinks.map((link, index) => (
                    <StaggeredAnimation
                      key={link.icon}
                      index={index + 1}
                      chainFromZero
                      baseDelay={socialBaseDelayS}
                      incrementDelay={SOCIAL_ICON_STAGGER_S}
                      fadeDirection="right"
                      reducedMotion={prefersReducedMotion}
                    >
                      <Link
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={SOCIAL_LINK_CLASS}
                      >
                        <span className="sr-only">{link.label}</span>
                        <SocialIcon
                          kind={link.icon}
                          className={SOCIAL_ICON_CLASS}
                        />
                      </Link>
                    </StaggeredAnimation>
                  ))}
                  {hasAnthemSocial ? (
                    <StaggeredAnimation
                      index={profileSocialLinks.length + 1}
                      chainFromZero
                      baseDelay={socialBaseDelayS}
                      incrementDelay={SOCIAL_ICON_STAGGER_S}
                      fadeDirection="right"
                      reducedMotion={prefersReducedMotion}
                    >
                      <AnthemPanel
                        variant="social"
                        anthemUrl={anthemUrl}
                        isOwner={isOwner}
                      />
                    </StaggeredAnimation>
                  ) : null}
                </nav>
              </div>
              <div className={avatar.className} style={avatar.style}>
                {avatarSrc ? (
                  <div className="relative aspect-square w-full">
                    <Image
                      src={avatarSrc}
                      alt={name}
                      fill
                      sizes="(max-width: 640px) 124px, (max-width: 768px) 144px, (max-width: 1024px) 176px, 208px"
                      className="rounded-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-full bg-white/5 text-3xl font-bold text-white/40">
                    {initials}
                  </div>
                )}
              </div>
            </div>

            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-hidden p-6 pb-16 md:flex-row md:items-stretch md:gap-6 md:pb-6">
              <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col justify-end gap-2 overflow-hidden">
                <div className={alias.clipClassName}>
                  <div
                    className={alias.innerClassName}
                    style={alias.innerStyle}
                  >
                    <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                      {name}
                    </h1>
                    {isMember ? <GoldVerifiedBadge /> : null}
                    {!subtitle && countryFlag ? (
                      <CountryFlag
                        code={countryFlag}
                        className="mt-2 sm:mt-3"
                      />
                    ) : null}
                  </div>
                </div>
                {subtitle ? (
                  <div className={fullName.clipClassName}>
                    <p
                      className={fullName.innerClassName}
                      style={fullName.innerStyle}
                      aria-label={
                        countryFlag ? `${subtitle}, ${countryFlag}` : subtitle
                      }
                    >
                      {countryFlag ? <CountryFlag code={countryFlag} /> : null}
                      <span>{subtitle}</span>
                    </p>
                  </div>
                ) : null}

                {/* TODO(team-db): role + team are placeholder until the team schema exists. */}
                <div className={roleTeam.clipClassName}>
                  <div
                    className={roleTeam.innerClassName}
                    style={roleTeam.innerStyle}
                  >
                    <Separator className="my-0.5 w-1/3 max-w-1/12 bg-white/10" />
                    <div className="flex flex-row flex-wrap items-center gap-x-3 text-sm font-medium text-white/90">
                      <div className="inline-flex items-center gap-1.5">
                        <Image
                          src={PLACEHOLDER.roleIconSrc}
                          alt=""
                          width={28}
                          height={16}
                          className="h-auto w-8 shrink-0 object-contain sm:h-[1.125rem]"
                          aria-hidden
                        />
                        <p className="text-sm font-light text-white/90">
                          {PLACEHOLDER.role}
                        </p>
                      </div>
                      <p className="text-xs leading-none text-primary/50">@</p>
                      <div className="inline-flex items-center gap-1.5">
                        <Image
                          src={PLACEHOLDER.teamLogoSrc}
                          alt={`${PLACEHOLDER.teamName} logo`}
                          width={40}
                          height={16}
                          className="h-5 w-auto shrink-0 object-contain"
                        />
                        <p className="text-sm font-semibold text-emerald-300">
                          {PLACEHOLDER.teamName}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={stats.clipClassName}>
                  <div
                    className={stats.innerClassName}
                    style={stats.innerStyle}
                  >
                    <Separator className="my-0.5 w-1/3 max-w-1/12 bg-white/10" />
                    <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-3 text-sm font-medium text-white/90">
                      {csgoPro || cs2Pro ? (
                        <ProStatusBadge csgoPro={csgoPro} cs2Pro={cs2Pro} />
                      ) : null}
                      {csgoPro || cs2Pro ? (
                        <span
                          className="size-0.5 shrink-0 rounded-full bg-white/50"
                          aria-hidden
                        />
                      ) : null}
                      {/* Skew stripes extend left of the badge; pad so stats clip overflow-hidden doesn't trim them. */}
                      {premierRating != null ? (
                        <div className="mt-0.5 pl-3">
                          <PremierEloBadge
                            rank={premierRating}
                            size="sm"
                            delay={countUpDelay}
                          />
                        </div>
                      ) : null}
                      <div className="mt-0.5">
                        <FaceitElo delay={countUpDelay} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={veritasSummary.className}
                style={veritasSummary.style}
              >
                <VeritasSummary />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
