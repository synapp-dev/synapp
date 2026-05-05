"use client";

import * as React from "react";
import Image from "next/image";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  Check,
  ChevronDown,
  History,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";

import { FaceitLevelBadge } from "@/components/atoms/faceit-level-badge";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";

/** Logged-in mock profile (party captain). */
const DUMMY_USER = {
  nickname: "donk",
  elo: 2876,
  level: 10,
};

const DUMMY_PARTY = [
  {
    id: "1",
    label: "donk",
    displayName: "donk",
    imageSrc: "/images/players/donk-headshot.png",
    initials: "DK",
    captain: false,
    role: "Rifler",
    rating: 1,
    team: "Spirit",
  },
  {
    id: "2",
    label: "s1mple",
    displayName: "s1mple",
    imageSrc: "/images/players/s1mple-headshot.png",
    initials: "S1",
    captain: false,
    role: "AWP",
    rating: 437,
    team: "BC.GAME",
  },
  {
    id: "3",
    label: "m0NESY",
    displayName: "m0NESY",
    imageSrc: "/images/players/m0nesy-headshot.png",
    initials: "M0",
    captain: false,
    role: "AWP",
    rating: 7,
    team: "Falcons",
  },
  {
    id: "4",
    label: "ZywOo",
    displayName: "ZywOo",
    imageSrc: "/images/players/zywoo-headshot.png",
    initials: "ZY",
    captain: false,
    role: "AWP",
    rating: 95,
    team: "Vitality",
  },
] as const;

const PARTY_SLOTS = 5;

/** Center slot index (0-based): wider grid track + `emphasis` styling. */
const PARTY_CENTER_INDEX = 2;

/** Five columns fill parent width; middle column 1.25× each outer slot. */
const PARTY_GRID_TEMPLATE =
  "grid w-full grid-cols-[1fr_1fr_1.25fr_1fr_1fr] items-center gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-7";

/** Slightly taller than 5×7 trading stock — closer to classic portrait “football” cards. */
const PARTY_CARD_ASPECT = "aspect-[2/3]";

/** Leaderboard ranks 1–3 get premium gold card treatment (`member.rating` is rank index). */
const TOP_LEADERBOARD_RANK = 3;

function isTopLeaderboardRank(rank: number): boolean {
  const r = Math.trunc(rank);
  return r >= 1 && r <= TOP_LEADERBOARD_RANK;
}

/** Fade team mark behind portrait — matches `player-profile-mock` treatment. */
const PARTY_CARD_TEAM_LOGO_MASK: React.CSSProperties = {
  WebkitMaskImage:
    "linear-gradient(to bottom, #000 0%, #000 12%, rgba(0,0,0,0.75) 38%, rgba(0,0,0,0.25) 68%, transparent 100%)",
  maskImage:
    "linear-gradient(to bottom, #000 0%, #000 12%, rgba(0,0,0,0.75) 38%, rgba(0,0,0,0.25) 68%, transparent 100%)",
  WebkitMaskSize: "100% 100%",
  maskSize: "100% 100%",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
};

type PartyMemberId = (typeof DUMMY_PARTY)[number]["id"];

/** Watermark behind portrait — keyed by party slot / player (not org label text). */
const PARTY_CARD_PORTRAIT_LOGO_SRC: Record<PartyMemberId, string> = {
  "1": "/images/teams/spirit-logo.png",
  "2": "/images/teams/bcgame-logo.png",
  "3": "/images/teams/falcons-logo.png",
  "4": "/images/teams/vitality-logo.png",
};

/** Queue class / tier (highest → lowest): Champions → Stellaris → Genesis → Open */
const LEAGUE_OPTIONS = [
  { id: "champions", title: "Champions" },
  { id: "stellaris", title: "Stellaris" },
  { id: "genesis", title: "Genesis" },
  { id: "open", title: "Open" },
] as const;

const LEAGUE_STAR_SRC: Record<(typeof LEAGUE_OPTIONS)[number]["id"], string> = {
  champions: "/images/icons/champions-star.svg",
  stellaris: "/images/icons/stellaris-star.svg",
  genesis: "/images/icons/genesis-star.svg",
  open: "/images/logos/intradark-symbol-blue.svg",
};

/** Rank badge art behind the numeric rating on party cards (Open has no asset — pill fallback). */
const LEAGUE_RANK_SRC: Partial<
  Record<(typeof LEAGUE_OPTIONS)[number]["id"], string>
> = {
  champions: "/images/icons/champions-rank.svg",
  stellaris: "/images/icons/stellaris-rank.svg",
  genesis: "/images/icons/genesis-rank.svg",
};

function LeagueStarIcon({
  leagueId,
  className,
}: {
  leagueId: string;
  className?: string;
}) {
  const src =
    LEAGUE_STAR_SRC[leagueId as keyof typeof LEAGUE_STAR_SRC] ??
    LEAGUE_STAR_SRC.open;

  return (
    <Image
      src={src}
      alt=""
      width={16}
      height={16}
      className={cn("size-3.5 shrink-0 opacity-90", className)}
      aria-hidden
    />
  );
}

function LeagueNameText({ title }: { title: string }) {
  return (
    <>
      <span className="font-bold">{title}</span>
      <span className="font-normal"> League</span>
    </>
  );
}

const leagueSelectItemClass = cn(
  "focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pr-8 pl-2 text-xs outline-hidden",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
);

/** SSR-safe shell: matches SelectTrigger layout until Radix mounts (avoids hydration id mismatch). */
function LeagueSelectTriggerShell({
  title,
  leagueId,
}: {
  title: string;
  leagueId: string;
}) {
  return (
    <div
      className={cn(
        "flex h-9 max-w-full min-w-[10.5rem] shrink-0 items-center justify-between gap-2 rounded-md border border-white/15 bg-white/5 px-3 text-xs text-foreground sm:min-w-[12.5rem]",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      )}
      aria-hidden
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
        <LeagueStarIcon leagueId={leagueId} className="shrink-0" />
        <span className="min-w-0 truncate">
          <LeagueNameText title={title} />
        </span>
      </span>
      <ChevronDown className="size-4 opacity-50" />
    </div>
  );
}

function LeagueSelectItem({ value, title }: { value: string; title: string }) {
  return (
    <SelectPrimitive.Item
      value={value}
      className={leagueSelectItemClass}
      textValue={`${title} League`}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <LeagueStarIcon leagueId={value} className="shrink-0" />
        <SelectPrimitive.ItemText asChild>
          <span className="min-w-0 truncate">
            <LeagueNameText title={title} />
          </span>
        </SelectPrimitive.ItemText>
      </span>
    </SelectPrimitive.Item>
  );
}

/** 3D flip shell + faces — perspective on outer `group`, transitions on each face (see classic Y-flip pattern). */
const partyCardFlipFaceClass =
  "absolute inset-0 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-transparent backface-hidden [transform-style:preserve-3d] will-change-transform transition-transform duration-1000 ease-out";

/** Keep off the perspective wrapper — shadow there causes a square compositor layer during Y-flip. */
function partyCardFaceElevationShadow(isTopThree: boolean): string {
  return isTopThree
    ? "shadow-[0_14px_44px_-6px_rgba(245,158,11,0.35)]"
    : "shadow-[0_12px_40px_-8px_rgba(0,0,0,0.85)]";
}

/** 4+ digits use the same sizing as 3 (fits badge width). */
function partyCardRankDigitBucket(rank: number): 1 | 2 | 3 {
  const n = String(Math.abs(Math.trunc(rank))).length;
  if (n <= 1) return 1;
  if (n === 2) return 2;
  return 3;
}

function partyCardRankOverlayTextClass(
  bucket: 1 | 2 | 3,
  emphasis: boolean,
): string {
  if (emphasis) {
    const pb = bucket === 1 ? "pb-8" : bucket === 2 ? "pb-7" : "pb-6";
    if (bucket === 1) return `${pb} text-3xl sm:text-4xl`;
    if (bucket === 2) return `${pb} text-2xl sm:text-3xl`;
    return `${pb} text-xl sm:text-2xl`;
  }
  const pb = bucket === 1 ? "pb-7" : bucket === 2 ? "pb-6" : "pb-5";
  if (bucket === 1) return `${pb} text-2xl sm:text-3xl`;
  if (bucket === 2) return `${pb} text-xl sm:text-2xl`;
  return `${pb} text-lg sm:text-xl`;
}

function partyCardRankPillTextClass(
  bucket: 1 | 2 | 3,
  emphasis: boolean,
): string {
  if (emphasis) {
    if (bucket === 1) return "text-5xl";
    if (bucket === 2) return "text-[2.75rem] leading-none";
    return "text-4xl";
  }
  if (bucket === 1) return "text-5xl";
  if (bucket === 2) return "text-4xl";
  return "text-3xl";
}

function PartyCardRatingBadge({
  rating,
  leagueId,
  emphasis,
}: {
  rating: number;
  leagueId: string;
  emphasis: boolean;
}) {
  const rankSrc =
    LEAGUE_RANK_SRC[leagueId as keyof typeof LEAGUE_RANK_SRC] ?? undefined;

  const corner = emphasis ? "right-7 top-7" : "right-5 top-5";
  const rankDisplay = Math.trunc(rating);
  const digitBucket = partyCardRankDigitBucket(rankDisplay);

  if (!rankSrc) {
    return (
      <span
        className={cn(
          "absolute z-[6] rounded-sm px-2 py-1 font-black tabular-nums leading-none text-primary shadow-md",
          corner,
          partyCardRankPillTextClass(digitBucket, emphasis),
        )}
        aria-label={`Rank ${rankDisplay}`}
      >
        {rankDisplay}
      </span>
    );
  }

  return (
    <div
      className={cn("absolute z-[6]", corner)}
      aria-label={`Rank ${rankDisplay}`}
    >
      <div
        className={cn(
          "relative shrink-0 drop-shadow-lg",
          emphasis ? "h-[5.6rem] w-[4.76rem]" : "h-[4.8rem] w-[4.08rem]",
        )}
      >
        <Image
          src={rankSrc}
          alt=""
          fill
          className="object-contain object-center"
          sizes={emphasis ? "90px" : "77px"}
        />
        <span
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center px-0.5 text-center font-black tabular-nums leading-none tracking-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]",
            partyCardRankOverlayTextClass(digitBucket, emphasis),
          )}
        >
          {rankDisplay}
        </span>
      </div>
    </div>
  );
}

function PartyTradingCard({
  member,
  leagueId,
  emphasis = false,
}: {
  member: (typeof DUMMY_PARTY)[number];
  leagueId: string;
  emphasis?: boolean;
}) {
  const teamLogoSrc = PARTY_CARD_PORTRAIT_LOGO_SRC[member.id];
  const isTopThree = isTopLeaderboardRank(member.rating);

  return (
    <div
      className={cn(
        "group relative min-w-0 w-full max-w-full overflow-visible",
        PARTY_CARD_ASPECT,
        "[perspective:900px]",
      )}
    >
      <div className="absolute inset-0 bg-transparent [transform-style:preserve-3d]">
        {/* Front */}
        <div
          className={cn(
            partyCardFlipFaceClass,
            "isolate rotate-y-0 group-hover:rotate-y-180",
            partyCardFaceElevationShadow(isTopThree),
            isTopThree &&
              "bg-gradient-to-br from-amber-100/40 via-amber-500/35 to-amber-950/80 ring-1 ring-amber-400/55",
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-0 rounded-2xl",
              isTopThree
                ? "bg-gradient-to-br from-white/15 via-transparent to-amber-950/30"
                : "bg-gradient-to-br from-white/[0.15] via-transparent to-transparent",
            )}
          />
          {member.captain ? (
            <Badge
              className={cn(
                "absolute z-[5] border-amber-400/60 bg-amber-500 font-black text-black hover:bg-amber-500",
                emphasis
                  ? "left-2 top-3 h-6 px-1.5 text-[10px]"
                  : "left-1 top-2 h-5 px-1 text-[9px]",
              )}
            >
              C
            </Badge>
          ) : null}
          <PartyCardRatingBadge
            rating={member.rating}
            leagueId={leagueId}
            emphasis={emphasis}
          />
          {/*
            Portrait fills the face; bottom-half footer is absolutely positioned with
            its own backdrop above the image stack (z-[10] vs z-[1]).
          */}
          <div className="absolute inset-0 z-[1] overflow-hidden rounded-2xl">
            <div className="absolute inset-x-0 bottom-0 -top-[10%] overflow-hidden rounded-t-2xl">
              <div
                className={cn(
                  "pointer-events-none absolute bottom-0 left-0 top-10 z-0",
                  emphasis
                    ? "w-[min(300%,28rem)] -translate-x-[18%] sm:-translate-x-[14%]"
                    : "w-[min(340%,24rem)] -translate-x-[22%] sm:-translate-x-[18%]",
                )}
                aria-hidden
                style={PARTY_CARD_TEAM_LOGO_MASK}
              >
                <Image
                  src={teamLogoSrc}
                  alt=""
                  fill
                  className="object-contain object-center opacity-[0.48]"
                  sizes={
                    emphasis
                      ? "(max-width:768px) 240px, 300px"
                      : "(max-width:768px) 200px, 260px"
                  }
                />
              </div>
              <Image
                src={member.imageSrc}
                alt=""
                fill
                className={cn(
                  "relative z-[1] object-contain object-left",
                  emphasis
                    ? "pt-10 pr-14 scale-[1.6]"
                    : "pt-8 pr-12 [scale:1.6]",
                )}
                priority={member.captain}
              />
            </div>
          </div>
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 top-1/3 z-[10] flex flex-col justify-end overflow-hidden rounded-b-2xl",
              emphasis ? "px-2.5 pb-3 pt-2" : "px-2 pb-2.5 pt-2",
            )}
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-b-2xl bg-gradient-to-t from-black via-black/75 to-transparent"
              aria-hidden
            />

            <div
              className={cn(
                "relative z-[2] flex min-w-0 flex-col gap-0.5 p-2",
                emphasis ? "gap-1" : "gap-1",
              )}
            >
              <p
                className={cn(
                  "min-w-0 truncate font-semibold leading-none tracking-tight text-white",
                  emphasis ? "text-3xl" : "text-2xl",
                )}
              >
                {member.displayName}
              </p>
              <div
                className={cn(
                  "flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 font-medium text-white/90",
                  emphasis
                    ? "text-[11px] sm:text-xs"
                    : "text-[10px] sm:text-[11px]",
                )}
              >
                <span className="font-normal">{member.role}</span>
                <span className="leading-none text-primary/50">@</span>
                <div className="inline-flex min-w-0 max-w-full items-center gap-1">
                  <Image
                    src={teamLogoSrc}
                    alt=""
                    width={40}
                    height={16}
                    className={cn(
                      "h-3 w-auto shrink-0 object-contain opacity-95",
                      emphasis && "h-3.5 sm:h-4",
                    )}
                    sizes="40px"
                  />
                  <span className="truncate font-semibold text-emerald-300/95">
                    {member.team}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back — starts at 180°; on hover both faces complete a full Y spin so the back reads upright */}
        <div
          className={cn(
            partyCardFlipFaceClass,
            "rotate-y-180 group-hover:rotate-y-[360deg]",
            partyCardFaceElevationShadow(isTopThree),
            isTopThree
              ? "bg-gradient-to-br from-amber-200/25 via-amber-900/25 to-zinc-950/50 ring-1 ring-amber-400/35"
              : "bg-gradient-to-br from-white/[0.07] via-zinc-900/20 to-zinc-950/45",
          )}
          aria-hidden
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-12deg, transparent, transparent 6px, rgba(255,255,255,0.04) 6px, rgba(255,255,255,0.04) 7px)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 50% 35%, var(--sidebar-primary), transparent 55%)",
            }}
          />
          <div className="relative flex h-full min-h-0 flex-col items-center justify-center gap-3 p-4">
            <div
              className={cn(
                "relative shrink-0 opacity-95",
                emphasis
                  ? "h-14 w-28 sm:h-16 sm:w-32"
                  : "h-11 w-24 sm:h-12 sm:w-28",
              )}
            >
              <Image
                src={teamLogoSrc}
                alt=""
                fill
                className="object-contain object-center"
                sizes={emphasis ? "128px" : "112px"}
              />
            </div>
            <p
              className={cn(
                "font-black tracking-tighter text-white/90",
                emphasis ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl",
              )}
            >
              {member.initials}
            </p>
            <p
              className={cn(
                "max-w-full truncate text-center font-semibold uppercase tracking-[0.2em] text-white/35",
                emphasis
                  ? "text-[10px] sm:text-xs"
                  : "text-[9px] sm:text-[10px]",
              )}
            >
              Party
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PartySlotEmpty({
  index,
  emphasis = false,
}: {
  index: number;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label="Invite player"
      className={cn(
        "flex min-w-0 w-full max-w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-gradient-to-b from-zinc-900/60 to-black/50 text-muted-foreground transition",
        PARTY_CARD_ASPECT,
        emphasis ? "gap-2" : "gap-1",
        "hover:border-white/30 hover:bg-zinc-900/40 hover:text-sidebar-primary",
      )}
    >
      <Plus
        className={
          emphasis
            ? "size-8 opacity-70 sm:size-9"
            : "size-6 opacity-70 sm:size-7"
        }
      />
      <span
        className={cn(
          "px-1.5 text-center font-semibold uppercase tracking-wide",
          emphasis ? "text-[11px]" : "text-[10px]",
        )}
      >
        Invite Player
      </span>
    </button>
  );
}

export function FaceitPlayMock() {
  const [leagueSelectMounted, setLeagueSelectMounted] = React.useState(false);
  React.useEffect(() => {
    setLeagueSelectMounted(true);
  }, []);

  const [selectedLeague, setSelectedLeague] =
    React.useState<string>("champions");
  const [queueSearching, setQueueSearching] = React.useState(false);

  const selectedLeagueTitle =
    LEAGUE_OPTIONS.find((o) => o.id === selectedLeague)?.title ?? "Champions";

  return (
    <div className="space-y-4">
      <div>
        <div className="relative border-b border-white/10 px-4 py-3 sm:px-5">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 0%, var(--sidebar-primary) 0%, transparent 45%)",
            }}
          />
          <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex h-9 shrink-0 items-center pb-0.5">
                <Image
                  src="/images/logos/cs2-logo-black.svg"
                  alt="Counter-Strike 2"
                  width={466}
                  height={198}
                  className="h-6 w-auto max-w-[min(100%,9rem)] object-contain object-left dark:hidden sm:h-7"
                  priority
                />
                <Image
                  src="/images/logos/cs2-logo-white.svg"
                  alt="Counter-Strike 2"
                  width={466}
                  height={198}
                  className="hidden h-6 w-auto max-w-[min(100%,9rem)] object-contain object-left dark:block sm:h-7"
                  priority
                />
              </div>
              <Separator
                orientation="vertical"
                className="hidden h-6 bg-white/10 lg:block"
              />
              {leagueSelectMounted ? (
                <Select
                  value={selectedLeague}
                  onValueChange={setSelectedLeague}
                >
                  <SelectTrigger
                    size="sm"
                    className="h-9 min-w-[10.5rem] max-w-full border-white/15 bg-white/5 text-xs text-foreground shadow-none hover:bg-white/10 data-[size=sm]:h-9 sm:min-w-[12.5rem]"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                      <LeagueStarIcon
                        leagueId={selectedLeague}
                        className="shrink-0"
                      />
                      <SelectValue placeholder="Select league" />
                    </span>
                  </SelectTrigger>
                  <SelectContent
                    align="start"
                    className="min-w-[var(--radix-select-trigger-width)]"
                  >
                    {LEAGUE_OPTIONS.map((opt) => (
                      <LeagueSelectItem
                        key={opt.id}
                        value={opt.id}
                        title={opt.title}
                      />
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <LeagueSelectTriggerShell
                  title={selectedLeagueTitle}
                  leagueId={selectedLeague}
                />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1">
                <ShieldCheck className="size-3.5 text-emerald-400" />
                <span className="text-[11px] font-medium text-emerald-100/90">
                  Anti-Cheat
                </span>
                <Badge className="h-5 border-0 bg-emerald-600/90 px-1.5 text-[10px] text-white hover:bg-emerald-600">
                  On
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-5 sm:py-5">
          <div className="space-y-5">
            {queueSearching ? (
              <div className="flex items-center gap-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400 opacity-60" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-sky-400" />
                </span>
                <div>
                  <p className="text-sm font-medium text-sky-100">
                    Searching for a match…
                  </p>
                  <p className="text-xs text-sky-200/70">
                    Est. wait ~2:40 · Skill level {DUMMY_USER.level}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="ml-auto shrink-0"
                  onClick={() => setQueueSearching(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : null}

            <section className="flex w-full flex-col items-center gap-5">
              {/* <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Users className="size-3.5" />
                Party
                <Badge
                  variant="secondary"
                  className="h-5 text-[10px] font-normal"
                >
                  {DUMMY_PARTY.length} / {PARTY_SLOTS}
                </Badge>
              </div> */}
              <div className={cn(PARTY_GRID_TEMPLATE, "pb-1 pt-6 sm:pt-8")}>
                {Array.from({ length: PARTY_SLOTS }).map((_, slotIndex) => {
                  const emphasis = slotIndex === PARTY_CENTER_INDEX;
                  const member = DUMMY_PARTY[slotIndex];
                  if (member) {
                    return (
                      <div key={member.id} className="min-w-0">
                        <PartyTradingCard
                          member={member}
                          leagueId={selectedLeague}
                          emphasis={emphasis}
                        />
                      </div>
                    );
                  }
                  const emptyIndex = slotIndex - DUMMY_PARTY.length;
                  return (
                    <div key={`slot-${emptyIndex}`} className="min-w-0">
                      <PartySlotEmpty index={emptyIndex} emphasis={emphasis} />
                    </div>
                  );
                })}
              </div>
              {/* <div className="flex w-full justify-center px-1">
                <Button
                  type="button"
                  disabled={queueSearching}
                  className={cn(
                    "h-12 w-fit max-w-full shrink-0 px-8 font-bold shadow-lg transition disabled:opacity-70",
                    selectedLeague === "champions"
                      ? "group inline-flex items-center justify-center gap-2 bg-gradient-to-br from-[#ffd86f] via-[#c19b33] to-[#7b5c24] px-5 text-sm tracking-wide text-white hover:brightness-[0.94] active:brightness-[0.88] sm:px-6 sm:text-base"
                      : "bg-sidebar-primary text-base tracking-wide text-sidebar-primary-foreground hover:bg-sidebar-primary/90",
                  )}
                  onClick={() => setQueueSearching(true)}
                >
                  {selectedLeague === "champions" ? (
                    <>
                      <span
                        className={cn(
                          "text-center uppercase leading-tight",
                          "[text-shadow:0_2px_8px_rgba(0,0,0,0.65),0_1px_3px_rgba(0,0,0,0.9)]",
                        )}
                      >
                        {queueSearching ? "FINDING MATCH…" : "FIND MATCH"}
                      </span>
                      <Image
                        src={LEAGUE_STAR_SRC.champions}
                        alt=""
                        width={24}
                        height={24}
                        className="size-5 shrink-0 motion-safe:group-hover:animate-spin sm:size-6"
                        aria-hidden
                      />
                    </>
                  ) : queueSearching ? (
                    "In queue…"
                  ) : (
                    "PLAY"
                  )}
                </Button>
              </div> */}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
