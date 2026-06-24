"use client";

import * as React from "react";
import Image from "next/image";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, Plus, ShieldCheck } from "lucide-react";
import CountUp from "react-countup";

import { toast } from "sonner";

import {
  useJoinQueue,
  useLeaveQueue,
  useQueueStatus,
} from "@/entities/match-queue/hooks/use-queue";
import { useSimController } from "@/entities/match-queue/hooks/use-sim";
import type { QueueLeague } from "@/entities/match-queue/lib/leagues";
import { positionLabel } from "@/entities/players/lib/positions";
import { AcceptMatchDialog } from "@/components/organisms/accept-match-dialog";
import { PugSimPanel } from "@/components/organisms/pug-sim-panel";
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

/**
 * The signed-in player's Play-card data — resolved server-side in
 * app/(main)/play/page.tsx (persona/avatar from steam_profiles, ELO from
 * player_ratings, role from team_positions default row). `null` when signed out.
 */
export type PlayCardMe = {
  steamid64: string;
  name: string;
  /** Transparent full-body character render (football-card portrait), if one exists. */
  portraitUrl: string | null;
  /** Steam avatar — fallback portrait when there's no character render. */
  avatarUrl: string | null;
  countryCode: string | null;
  rating: number;
  /** Global account/leaderboard rank shown top-left (placeholder until ranking lands). */
  rank: number | null;
  position: string | null;
  /** Most-recent team (name + resolved logo URL + brand color) for the "@ team" line. */
  teamName: string | null;
  teamLogoUrl: string | null;
  teamColor: string | null;
};

const PARTY_SLOTS = 5;

/** Center slot index (0-based): wider grid track + `emphasis` styling. The logged-in player. */
const PARTY_CENTER_INDEX = 2;

/** Five columns fill parent width; middle column 1.25× each outer slot. */
const PARTY_GRID_TEMPLATE =
  "grid w-full grid-cols-[1fr_1fr_1.25fr_1fr_1fr] items-center gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-7";

/** Slightly taller than 5×7 trading stock — closer to classic portrait “football” cards. */
const PARTY_CARD_ASPECT = "aspect-[2/3]";

/** Fade the backdrop watermark behind the portrait (top solid → transparent bottom). */
const PARTY_CARD_BACKDROP_MASK: React.CSSProperties = {
  WebkitMaskImage:
    "linear-gradient(to bottom, #000 0%, #000 12%, rgba(0,0,0,0.75) 38%, rgba(0,0,0,0.25) 68%, transparent 100%)",
  maskImage:
    "linear-gradient(to bottom, #000 0%, #000 12%, rgba(0,0,0,0.75) 38%, rgba(0,0,0,0.25) 68%, transparent 100%)",
  WebkitMaskSize: "100% 100%",
  maskSize: "100% 100%",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
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

/** Rank badge art behind the numeric rating on the player card (Open has no asset — pill fallback). */
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

/** Keep off the perspective wrapper — shadow there causes a square compositor layer. */
function partyCardFaceElevationShadow(): string {
  return "shadow-[0_12px_40px_-8px_rgba(0,0,0,0.85)]";
}

/** 4+ digits use the same sizing as 3 (fits badge width). ELO is typically 3–4 digits. */
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

/** ELO badge: league rank art with the player's rating overlaid (pill fallback for Open). */
function PlayerCardRatingBadge({
  rating,
  leagueId,
  emphasis,
  delay = 0.35,
}: {
  rating: number;
  leagueId: string;
  emphasis: boolean;
  /** Seconds before the count-up begins (synced with the card fade-in). */
  delay?: number;
}) {
  const rankSrc =
    LEAGUE_RANK_SRC[leagueId as keyof typeof LEAGUE_RANK_SRC] ?? undefined;

  const corner = emphasis ? "right-7 top-7" : "right-5 top-5";
  const ratingDisplay = Math.trunc(rating);
  const digitBucket = partyCardRankDigitBucket(ratingDisplay);
  const count = (
    <CountUp
      start={0}
      end={ratingDisplay}
      duration={1.6}
      delay={delay}
      separator=","
      useEasing
    />
  );

  if (!rankSrc) {
    return (
      <span
        className={cn(
          "absolute z-[6] rounded-sm px-2 py-1 font-black tabular-nums leading-none text-primary shadow-md",
          corner,
          partyCardRankPillTextClass(digitBucket, emphasis),
        )}
        aria-label={`Rating ${ratingDisplay}`}
      >
        {count}
      </span>
    );
  }

  return (
    <div className={cn("absolute z-[6]", corner)} aria-label={`Rating ${ratingDisplay}`}>
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
          {count}
        </span>
      </div>
    </div>
  );
}

/** The signed-in player's trading card (center slot): Steam avatar + name + role + ELO. */
function MyPlayerCard({
  me,
  leagueId,
  emphasis = false,
}: {
  me: PlayCardMe;
  leagueId: string;
  emphasis?: boolean;
}) {
  const role = positionLabel(me.position);
  const initials = me.name.slice(0, 2).toUpperCase();
  // Team crest behind the render when the player has a team; else the league mark.
  const backdropSrc =
    me.teamLogoUrl ??
    LEAGUE_STAR_SRC[leagueId as keyof typeof LEAGUE_STAR_SRC] ??
    LEAGUE_STAR_SRC.open;
  const backdropOpacity = me.teamLogoUrl ? "opacity-[0.18]" : "opacity-[0.12]";

  return (
    <div
      className={cn(
        "group relative min-w-0 w-full max-w-full overflow-visible",
        PARTY_CARD_ASPECT,
      )}
    >
      <div
        className={cn(
          "absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-transparent",
          partyCardFaceElevationShadow(),
        )}
      >
        <div className="pointer-events-none absolute inset-0 z-0 rounded-2xl bg-gradient-to-br from-white/[0.15] via-transparent to-transparent" />
        {me.teamColor ? (
          <div
            className="pointer-events-none absolute inset-0 z-0 rounded-2xl"
            style={{
              background: `radial-gradient(120% 80% at 50% 0%, ${me.teamColor}24, transparent 62%)`,
            }}
            aria-hidden
          />
        ) : null}

        <PlayerCardRatingBadge
          rating={me.rank ?? me.rating}
          leagueId={leagueId}
          emphasis={emphasis}
        />

        {/* Portrait — transparent character render (football-card style), else Steam avatar. */}
        <div className="absolute inset-0 z-[1] overflow-hidden rounded-2xl">
          {me.portraitUrl ? (
            <>
              {/* Faint league-mark backdrop behind the cut-out render. */}
              <div
                className="pointer-events-none absolute inset-x-0 bottom-1/3 top-2 z-0"
                style={PARTY_CARD_BACKDROP_MASK}
                aria-hidden
              >
                <Image
                  src={backdropSrc}
                  alt=""
                  fill
                  className={cn("object-contain object-top", backdropOpacity)}
                  sizes={emphasis ? "240px" : "200px"}
                />
              </div>
              {/*
                Frame the full-body render like a sports card: zoomed so the full head
                shows with a little top padding, weighted left (≈⅓ cropped off the left
                edge), torso running to the bottom behind the nameplate.
              */}
              <Image
                src={me.portraitUrl}
                alt=""
                fill
                className="relative z-[1] object-cover object-top"
                style={{
                  transform: "scale(1.6) translate(-10%, 1%)",
                  transformOrigin: "center top",
                }}
                sizes={emphasis ? "(max-width:768px) 240px, 300px" : "(max-width:768px) 200px, 260px"}
                priority
              />
            </>
          ) : me.avatarUrl ? (
            <Image
              src={me.avatarUrl}
              alt=""
              fill
              className="object-cover object-top"
              sizes={emphasis ? "(max-width:768px) 240px, 300px" : "(max-width:768px) 200px, 260px"}
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-zinc-800 to-black">
              <span className="text-5xl font-black tracking-tighter text-white/25">
                {initials}
              </span>
            </div>
          )}
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

          <div className="relative z-[2] flex min-w-0 flex-col gap-1 p-2">
            <p
              className={cn(
                "min-w-0 truncate font-semibold leading-none tracking-tight text-white",
                emphasis ? "text-3xl" : "text-2xl",
              )}
            >
              {me.name}
            </p>
            <div
              className={cn(
                "flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 font-medium text-white/90",
                emphasis ? "text-[11px] sm:text-xs" : "text-[10px] sm:text-[11px]",
              )}
            >
              {role ? (
                <span className="inline-flex items-center gap-1">
                  <Image
                    src="/images/icons/ak47-icon-white.svg"
                    alt=""
                    width={32}
                    height={12}
                    className={cn(
                      "w-auto shrink-0 opacity-90",
                      emphasis ? "h-2" : "h-1.5",
                    )}
                    sizes="32px"
                  />
                  <span className="font-normal">{role}</span>
                </span>
              ) : (
                <span className="font-normal text-white/45">No role set</span>
              )}
              {me.teamName ? (
                <>
                  <span className="leading-none text-primary/50">@</span>
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1">
                    {me.teamLogoUrl ? (
                      <Image
                        src={me.teamLogoUrl}
                        alt=""
                        width={40}
                        height={16}
                        className={cn(
                          "h-3 w-auto shrink-0 object-contain opacity-95",
                          emphasis && "h-3.5 sm:h-4",
                        )}
                        sizes="40px"
                      />
                    ) : null}
                    <span
                      className="truncate font-semibold"
                      style={me.teamColor ? { color: me.teamColor } : undefined}
                    >
                      {me.teamName}
                    </span>
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Outer slot — teammates fill via matchmaking (solo queue), not party invites. */
function PartySlotEmpty({ emphasis = false }: { emphasis?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex min-w-0 w-full max-w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-gradient-to-b from-zinc-900/60 to-black/50 text-muted-foreground",
        PARTY_CARD_ASPECT,
        emphasis ? "gap-2" : "gap-1",
      )}
    >
      <Plus
        className={
          emphasis ? "size-8 opacity-40 sm:size-9" : "size-6 opacity-40 sm:size-7"
        }
      />
      <span
        className={cn(
          "px-1.5 text-center font-semibold uppercase tracking-wide opacity-70",
          emphasis ? "text-[11px]" : "text-[10px]",
        )}
      >
        Open Slot
      </span>
    </div>
  );
}

export function FaceitPlayMock({ me = null }: { me?: PlayCardMe | null }) {
  const [leagueSelectMounted, setLeagueSelectMounted] = React.useState(false);
  React.useEffect(() => {
    setLeagueSelectMounted(true);
  }, []);

  const [selectedLeague, setSelectedLeague] =
    React.useState<string>("champions");

  const { data: queueStatus, refetch: refetchQueue } = useQueueStatus({
    refetchInterval: 2000,
  });
  const joinQueue = useJoinQueue();
  const leaveQueue = useLeaveQueue();
  const sim = useSimController();

  const isDev = process.env.NODE_ENV !== "production";

  // Open the ready-check when the server reports a forming match (matched), or the
  // moment the simulator forms one (before the 2s poll catches up).
  const activeMatchId =
    (queueStatus?.you?.status === "matched"
      ? queueStatus.you.matchId
      : null) ?? sim.matchId;

  const handleMatchClosed = React.useCallback(() => {
    // Dismiss (not full reset) so a dodge cooldown survives for you to observe it
    // blocking the next FIND MATCH.
    sim.dismiss();
    refetchQueue();
  }, [sim, refetchQueue]);

  // Server-owned truth (optimistic while a join is in flight).
  const queueSearching =
    queueStatus?.you?.status === "searching" || joinQueue.isPending;
  const eligibility = queueStatus?.eligibility;
  const poolCount = queueStatus?.pool?.[selectedLeague as QueueLeague] ?? 0;

  const handleFindMatch = () => {
    if (eligibility && !eligibility.eligible) {
      toast.error(eligibility.reason ?? "You can't queue right now.");
      return;
    }
    joinQueue.mutate(
      { league: selectedLeague as QueueLeague },
      {
        onError: (e) => toast.error(e.message),
        onSuccess: (data) => {
          if (data.matchId) {
            toast.success("Match found — heading to the lobby…");
          }
        },
      },
    );
  };

  const handleCancelQueue = () => {
    leaveQueue.mutate(undefined, {
      onError: (e) => toast.error(e.message),
    });
  };

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
                    {poolCount} in {selectedLeagueTitle} queue · solo
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="ml-auto shrink-0"
                  disabled={leaveQueue.isPending}
                  onClick={handleCancelQueue}
                >
                  Cancel
                </Button>
              </div>
            ) : null}

            <section className="flex w-full flex-col items-center gap-5">
              <div className={cn(PARTY_GRID_TEMPLATE, "pb-1 pt-6 sm:pt-8")}>
                {Array.from({ length: PARTY_SLOTS }).map((_, slotIndex) => {
                  const isCenter = slotIndex === PARTY_CENTER_INDEX;
                  // Ripple the entrance outward from the player's card.
                  const animationDelay = `${Math.abs(slotIndex - PARTY_CENTER_INDEX) * 110}ms`;
                  return (
                    <div
                      key={isCenter ? "me" : `slot-${slotIndex}`}
                      className="min-w-0 animate-in fade-in slide-in-from-bottom-6 fill-mode-backwards duration-700 ease-out"
                      style={{ animationDelay }}
                    >
                      {isCenter && me ? (
                        <MyPlayerCard
                          me={me}
                          leagueId={selectedLeague}
                          emphasis
                        />
                      ) : (
                        <PartySlotEmpty emphasis={isCenter} />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex w-full justify-center px-1">
                <Button
                  type="button"
                  disabled={queueSearching}
                  className={cn(
                    "h-12 w-fit max-w-full shrink-0 px-8 font-bold shadow-lg transition disabled:opacity-70",
                    selectedLeague === "champions"
                      ? "group inline-flex items-center justify-center gap-2 bg-gradient-to-br from-[#ffd86f] via-[#c19b33] to-[#7b5c24] px-5 text-sm tracking-wide text-white hover:brightness-[0.94] active:brightness-[0.88] sm:px-6 sm:text-base"
                      : "bg-sidebar-primary text-base tracking-wide text-sidebar-primary-foreground hover:bg-sidebar-primary/90",
                  )}
                  onClick={handleFindMatch}
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
              </div>
            </section>
          </div>
        </div>
      </div>

      {isDev ? (
        <PugSimPanel league={selectedLeague as QueueLeague} controller={sim} />
      ) : null}

      <AcceptMatchDialog matchId={activeMatchId} onClose={handleMatchClosed} />
    </div>
  );
}
