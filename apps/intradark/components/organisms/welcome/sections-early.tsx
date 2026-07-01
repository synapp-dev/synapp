"use client";

/**
 * Welcome reel — sections 00–04 (Boot, Play, Scrims, Tournaments, Profile).
 *
 * Every section reveals on scroll-in (content is gated on an IntersectionObserver
 * so the reel doesn't play all at once) and collapses to a legible end-state
 * under prefers-reduced-motion.
 */

import * as React from "react";
import Image from "next/image";
import CountUp from "react-countup";
import {
  ChevronDown,
  ChevronsRight,
  Crown,
  Moon,
  Shield,
  Sun,
  Swords,
  Trophy,
} from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import { StreamText } from "@/components/atoms/stream-text";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import { IntradarkSymbolDraw } from "@/components/atoms/intradark-symbol-draw";
import { IntradarkWordmarkDraw } from "@/components/atoms/intradark-wordmark-draw";
import { AnimatedStat } from "@/components/organisms/animated-stat";

import { PlayQueuePop } from "./play-queue-pop";
import {
  GlassPanel,
  Headline,
  Kicker,
  Lede,
  SectionShell,
  useInViewOnce,
} from "./welcome-ui";

/* ============================================================ 00 · BOOT */

export function BootHero({
  persona,
  operatorNo,
}: {
  persona: string;
  operatorNo: number;
}) {
  const HERO_START = 2200;
  const CHAR = 55;
  const welcome = `welcome, ${persona}. `;

  return (
    <SectionShell index={0} center>
      <div className="flex flex-col items-center gap-7">
        <div className="flex items-start gap-2">
          <IntradarkSymbolDraw className="h-auto w-7 sm:w-8" />
          <IntradarkWordmarkDraw className="h-auto w-64 sm:w-80" />
        </div>

        <h1 className="text-balance font-stratum text-3xl tracking-tight drop-shadow-[0_2px_24px_rgba(0,0,0,0.7)] sm:text-5xl">
          <StreamText
            text={welcome}
            startDelay={HERO_START}
            charDelay={CHAR}
            className="font-light text-foreground"
          />
          <StreamText
            text="you're in."
            startDelay={HERO_START + welcome.length * CHAR}
            charDelay={CHAR}
            className="font-semibold text-[var(--brand-intradark-primary)]"
          />
        </h1>

        <p className="font-mono text-[0.7rem] uppercase tracking-[0.3em] text-white/45 sm:text-xs">
          You&apos;re operator No.{" 0"}
          <span className="tabular-nums text-white/80">
            <CountUp
              end={operatorNo}
              duration={2.6}
              separator=","
              delay={1.2}
            />
          </span>{" "}
          — the scene didn&apos;t wait.
        </p>

        <div className="mt-8 flex animate-float-gentle flex-col items-center gap-2 text-white/40">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.35em]">
            scroll to enter
          </span>
          <ChevronDown className="size-4" />
        </div>
      </div>
    </SectionShell>
  );
}

/* ============================================================ 01 · PLAY */

const PLAY_INTEGRATIONS = [
  "Website",
  "Discord",
  "In-game plugin",
  "Anti-cheat",
];

export function PlaySection({
  persona,
  personaAvatar,
  reduced,
}: {
  persona: string;
  personaAvatar?: string | null;
  reduced: boolean;
}) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>({ threshold: 0.15 });
  const shown = reduced || inView;

  return (
    <SectionShell index={1}>
      <div
        ref={ref}
        className="relative grid gap-10 lg:grid-cols-[1fr_minmax(340px,420px)] lg:items-center"
      >
        <div className="relative z-10 space-y-6">
          {shown && (
            <>
              <Kicker index={1} label="Play" />
              <Headline>
                Pure{" "}
                <span className="text-[var(--brand-intradark-primary)]">
                  CS.
                </span>
              </Headline>
              <Lede>No mutes. No rogue heroes. No 5 stacks in PUGs.</Lede>
              <div className="flex flex-wrap gap-2">
                {PLAY_INTEGRATIONS.map((l, i) => (
                  <StaggeredAnimation
                    key={l}
                    index={i}
                    fadeDirection="up"
                    chainFromZero
                    incrementDelay={0.08}
                    reducedMotion={reduced}
                  >
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/70">
                      {l}
                    </span>
                  </StaggeredAnimation>
                ))}
              </div>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-white/35">
                queue → accept → draft → discord → veto → positions → live
              </p>
            </>
          )}
        </div>

        <div className="relative z-10">
          <PlayQueuePop
            persona={persona}
            personaAvatar={personaAvatar}
            reduced={reduced}
          />
        </div>
      </div>
    </SectionShell>
  );
}

/* ========================================================== 02 · SCRIMS */

const SCRIM_LISTING_MAPS = [
  { name: "Inferno", badge: "/images/steam/maps/inferno-badge.png" },
  { name: "Ancient", badge: "/images/steam/maps/ancient-badge.png" },
  { name: "Nuke", badge: "/images/steam/maps/nuke-badge.png" },
];

/**
 * Faithful mock of the real ScrimDayCard
 * (entities/scrims/components/scrim-day-card.tsx): a confirmed scrim shows the
 * map art, the big map badge, the opponent avatar + name and a spinning tier
 * star; a listing shows the orange "Listed" state with its map badges.
 */
function ScrimCardMock({
  variant,
  time,
  opponent,
  opponentLogo,
  mapName,
  mapRadar,
  mapBadge,
  tierStar,
  listingMaps,
  incoming = false,
  reduced,
}: {
  variant: "scrim" | "listing";
  time: string;
  opponent?: string;
  opponentLogo?: string;
  mapName?: string;
  mapRadar?: string;
  mapBadge?: string;
  tierStar: string;
  listingMaps?: { name: string; badge: string }[];
  incoming?: boolean;
  reduced: boolean;
}) {
  const isScrim = variant === "scrim";
  const star = (
    <Image
      src={tierStar}
      alt=""
      width={20}
      height={20}
      style={{ animationDuration: "8s" }}
      className={cn(
        "size-5 shrink-0 object-contain",
        !reduced && "animate-spin-slow",
      )}
    />
  );

  return (
    <div
      className={cn(
        "relative flex min-h-[13.5rem] flex-col justify-between overflow-hidden rounded-lg border bg-cover bg-center p-3 text-left transition-[border-color,background-color] duration-500",
        isScrim
          ? "border-white/60"
          : "border-orange-500/70 bg-orange-500/[0.06]",
      )}
    >
      {/* Map art + top-down fade (scrim only, like the real card's screenshot bg) */}
      {isScrim && mapRadar ? (
        <>
          <Image
            src={mapRadar}
            alt=""
            fill
            sizes="320px"
            className="pointer-events-none object-cover opacity-60"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/45 to-black"
          />
        </>
      ) : null}

      {/* Top: time + big map badge */}
      <div className="relative z-10 flex items-start justify-between">
        <span className="text-xs font-bold text-muted-foreground">{time}</span>
        {isScrim && mapBadge ? (
          <Image
            src={mapBadge}
            alt={mapName ?? ""}
            width={90}
            height={90}
            className="h-[3.75rem] w-auto object-contain drop-shadow-[0_3px_5px_rgba(0,0,0,0.65)]"
          />
        ) : null}
      </div>

      {/* Bottom: opponent / listed + tier star + map badges */}
      <div className="relative z-10 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {isScrim ? (
            <>
              <div className="flex items-center gap-2">
                <Image
                  src={opponentLogo ?? ""}
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 shrink-0 object-contain"
                />
                <span className="truncate text-2xl font-black text-foreground">
                  {opponent}
                </span>
                {star}
              </div>
              <p className="text-xs text-muted-foreground">on {mapName}</p>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Swords className="size-6 text-orange-400" />
              <span className="text-2xl font-black text-foreground">
                Listed
              </span>
              {star}
            </div>
          )}
        </div>

        {!isScrim && listingMaps ? (
          <div className="flex items-center gap-1">
            {listingMaps.map((m) => (
              <Image
                key={m.name}
                src={m.badge}
                alt={m.name}
                title={m.name}
                width={16}
                height={16}
                className="h-6 w-auto object-contain opacity-90"
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Incoming challenge marker */}
      {incoming ? (
        <div
          className="absolute right-2 top-1/2 z-20 -translate-y-1/2"
          style={
            reduced
              ? undefined
              : { animation: "slide-left-fade-in 0.4s ease-out both" }
          }
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-sky-500/90 text-white shadow-lg">
            <ChevronsRight className="size-4 animate-bounce-right" />
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function ScrimsSection({ reduced }: { reduced: boolean }) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>({ threshold: 0.25 });
  const shown = reduced || inView;

  // Scripted self-play: your listing gets challenged → it locks into a live scrim.
  const [heroVariant, setHeroVariant] = React.useState<"listing" | "scrim">(
    reduced ? "scrim" : "listing",
  );
  const [incoming, setIncoming] = React.useState(false);
  React.useEffect(() => {
    if (!shown || reduced) return;
    const t1 = window.setTimeout(() => setIncoming(true), 1400);
    const t2 = window.setTimeout(() => {
      setIncoming(false);
      setHeroVariant("scrim");
    }, 2500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [shown, reduced]);

  return (
    <SectionShell index={2}>
      <div
        ref={ref}
        className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-center"
      >
        <div className="space-y-6">
          {shown && (
            <>
              <Kicker index={2} label="Scrims" />
              <Headline>
                Post availability.
                <br />
                <span className="text-orange-400">Get challenged.</span>
              </Headline>
              <Lede>
                Block hourly availability, get challenged by map, and lock into
                a live lobby with server connect details the moment both teams
                confirm.
              </Lede>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {["Champions", "Stellaris", "Genesis"].map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold uppercase tracking-widest text-white/60"
                  >
                    <Shield className="size-3 text-orange-400/80" /> {t}+
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4 text-white/45">
                <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest">
                  <Sun className="size-3.5" /> AM
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-white/80">
                  <Moon className="size-3.5" /> Pro hours · 14:00–22:00
                </span>
              </div>
            </>
          )}
        </div>

        {/* Stacked scrim cards — a live scrim + an open listing, like the real board */}
        {shown && (
          <div className="grid auto-rows-fr grid-cols-1 gap-3">
            {heroVariant === "scrim" ? (
              <div
                style={
                  reduced
                    ? undefined
                    : { animation: "slide-up-fade-in 0.5s ease-out both" }
                }
              >
                <ScrimCardMock
                  variant="scrim"
                  time="7:00 PM"
                  opponent="Vitality"
                  opponentLogo="/images/teams/vitality-logo.png"
                  mapName="Mirage"
                  mapRadar="/radars/de_mirage.png"
                  mapBadge="/images/steam/maps/mirage-badge.png"
                  tierStar="/images/icons/champions-star.svg"
                  reduced={reduced}
                />
              </div>
            ) : (
              <ScrimCardMock
                variant="listing"
                time="7:00 PM"
                tierStar="/images/icons/champions-star.svg"
                listingMaps={[
                  {
                    name: "Mirage",
                    badge: "/images/steam/maps/mirage-badge.png",
                  },
                  {
                    name: "Dust II",
                    badge: "/images/steam/maps/dust2-badge.png",
                  },
                ]}
                incoming={incoming}
                reduced={reduced}
              />
            )}

            <ScrimCardMock
              variant="listing"
              time="8:00 PM"
              tierStar="/images/icons/stellaris-star.svg"
              listingMaps={SCRIM_LISTING_MAPS}
              reduced={reduced}
            />
          </div>
        )}
      </div>
    </SectionShell>
  );
}

/* ====================================================== 03 · TOURNAMENTS */

const LEAGUES = [
  { name: "Champions", accent: "#e0b04a", prize: "$5,000", players: 1240 },
  { name: "Stellaris", accent: "#a78bfa", prize: "$2,500", players: 860 },
  { name: "Genesis", accent: "#4c9ccb", prize: "$1,000", players: 512 },
];
const FORMAT_BADGES = ["Open Ladder", "League", "Bracket", "PUG Queue"];
const LADDER = [
  { rank: 1, name: "vVv Reaper", pts: 428, wl: "14–2", played: 16 },
  { rank: 2, name: "Nocturne", pts: 401, wl: "13–4", played: 17 },
  { rank: 3, name: "Ashen Wolves", pts: 372, wl: "11–5", played: 16 },
  { rank: 4, name: "Cold Static", pts: 356, wl: "10–6", played: 16 },
  { rank: 5, name: "Paperghost", pts: 331, wl: "9–7", played: 16 },
];

export function TournamentsSection({ reduced }: { reduced: boolean }) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>({ threshold: 0.25 });
  const shown = reduced || inView;

  const [leagueIdx, setLeagueIdx] = React.useState(0);
  const [swapped, setSwapped] = React.useState(false);

  React.useEffect(() => {
    if (!shown || reduced) return;
    const cycle = window.setInterval(
      () => setLeagueIdx((i) => (i + 1) % LEAGUES.length),
      3600,
    );
    const swap = window.setTimeout(() => setSwapped(true), 1600);
    return () => {
      window.clearInterval(cycle);
      window.clearTimeout(swap);
    };
  }, [shown, reduced]);

  const league = LEAGUES[leagueIdx]!;
  // Rows 2 & 3 (index) swap when the challenger wins.
  const rows = React.useMemo(() => {
    if (!swapped) return LADDER;
    const copy = [...LADDER];
    const a = copy[2]!;
    const b = copy[3]!;
    copy[2] = { ...b, rank: 3 };
    copy[3] = { ...a, rank: 4 };
    return copy;
  }, [swapped]);

  return (
    <SectionShell index={3}>
      <div ref={ref}>
        {shown && (
          <div className="space-y-8">
            <Kicker index={3} label="Tournaments" />
            <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center">
              {/* League hero */}
              <GlassPanel className="min-h-[19rem] border-white/12">
                <Image
                  src="/radars/de_ancient.png"
                  alt=""
                  fill
                  className="pointer-events-none object-cover opacity-15 grayscale"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black via-black/70 to-transparent"
                />
                <div className="relative z-10 flex h-full flex-col justify-between p-6">
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.3em]"
                      style={{ color: league.accent }}
                    >
                      <Trophy className="size-3.5" /> Featured league
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
                      <span className="relative flex size-2">
                        <span className="absolute inline-flex size-2 animate-glow-breathe rounded-full bg-emerald-400" />
                      </span>
                      <CountUp
                        end={league.players}
                        duration={1.4}
                        separator=","
                      />{" "}
                      live
                    </span>
                  </div>

                  <div>
                    <Headline
                      className="text-5xl md:text-6xl"
                      key={league.name}
                    >
                      <StreamText
                        text={league.name}
                        charDelay={45}
                        className="font-black"
                        replayKey={league.name}
                      />
                    </Headline>
                    <div className="mt-3 flex items-center gap-3">
                      <span
                        className="rounded-md px-2.5 py-1 font-stratum text-sm font-bold text-black"
                        style={{ backgroundColor: league.accent }}
                      >
                        {league.prize} pool
                      </span>
                      <span className="text-xs uppercase tracking-widest text-white/40">
                        Season · Live
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {FORMAT_BADGES.map((b, i) => (
                      <StaggeredAnimation
                        key={b}
                        index={i}
                        fadeDirection="up"
                        chainFromZero
                        incrementDelay={0.07}
                        reducedMotion={reduced}
                      >
                        <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-white/65">
                          {b}
                        </span>
                      </StaggeredAnimation>
                    ))}
                  </div>
                </div>
              </GlassPanel>

              {/* Positional ladder */}
              <GlassPanel className="border-white/12 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-stratum text-sm font-black uppercase tracking-widest text-foreground">
                    Open Ladder
                  </span>
                  <span className="text-[0.6rem] uppercase tracking-widest text-white/35">
                    Challenge ±3 ranks
                  </span>
                </div>
                <div className="grid grid-cols-[1.5rem_1fr_auto_auto] gap-x-3 text-[0.6rem] uppercase tracking-widest text-white/30">
                  <span>#</span>
                  <span>Player</span>
                  <span className="text-right">Steal</span>
                  <span className="text-right">W–L</span>
                </div>
                <ul className="mt-1.5 space-y-1">
                  {rows.map((r, i) => {
                    const moved = swapped && (i === 2 || i === 3);
                    return (
                      <li
                        key={r.name}
                        className={cn(
                          "grid grid-cols-[1.5rem_1fr_auto_auto] items-center gap-x-3 rounded-md px-2 py-1.5 text-sm transition-colors",
                          i === 0 ? "bg-white/[0.05]" : "",
                          moved && "bg-[var(--brand-intradark-primary)]/15",
                        )}
                        style={
                          moved && !reduced
                            ? {
                                animation:
                                  i === 2
                                    ? "slide-up-fade-in 0.45s ease-out both"
                                    : "slide-down-fade-in 0.45s ease-out both",
                              }
                            : undefined
                        }
                      >
                        <span className="font-stratum font-black tabular-nums text-white/50">
                          {r.rank}
                        </span>
                        <span className="truncate font-medium text-white/85">
                          {r.name}
                          {moved && i === 2 && (
                            <span className="ml-1.5 text-[0.6rem] font-bold text-[var(--brand-intradark-primary)]">
                              ▲
                            </span>
                          )}
                        </span>
                        <span className="text-right font-semibold tabular-nums text-white/70">
                          {r.pts}
                        </span>
                        <span className="text-right tabular-nums text-white/45">
                          {r.wl}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </GlassPanel>
            </div>
            <Lede className="max-w-2xl">
              Brackets, leagues, the open ladder, and the PUG queue — one
              competition engine, one hierarchy. New entrants join at the bottom
              and climb by stealing ranks above them.
            </Lede>
          </div>
        )}
      </div>
    </SectionShell>
  );
}

/* ======================================================== 04 · PROFILE */

const DNA: { label: string; value: number }[] = [
  { label: "Aim", value: 87 },
  { label: "Utility", value: 92 },
  { label: "Positioning", value: 84 },
  { label: "Opening", value: 89 },
  { label: "Clutch", value: 91 },
];
const VERITAS_AXES = [
  { label: "Plausibility", value: 0.9, color: "#4c9ccb" },
  { label: "Establishment", value: 0.72, color: "#0483c8" },
  { label: "Corroboration", value: 0.84, color: "#2f7fb8" },
  { label: "Karma", value: 0.66, color: "#00497d" },
];

function VeritasRadial({ reduced }: { reduced: boolean }) {
  const [ref, inView] = useInViewOnce<SVGSVGElement>({ threshold: 0.4 });
  const armed = reduced || inView;
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="relative mx-auto grid size-60 place-items-center">
      <svg
        ref={ref}
        viewBox={`0 0 ${size} ${size}`}
        className="size-full -rotate-90"
        role="img"
        aria-label="Veritas legitimacy rings"
      >
        {VERITAS_AXES.map((axis, i) => {
          const r = 44 + i * 22;
          const circ = 2 * Math.PI * r;
          const target = circ * (1 - axis.value);
          return (
            <g key={axis.label}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={9}
              />
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={axis.color}
                strokeWidth={9}
                strokeLinecap="round"
                strokeDasharray={circ}
                style={{
                  strokeDashoffset: armed ? target : circ,
                  transition: reduced
                    ? undefined
                    : `stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1) ${0.15 + i * 0.14}s`,
                }}
              />
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-stratum text-5xl font-black tabular-nums text-foreground">
            {armed ? (
              <CountUp end={82} duration={2} delay={reduced ? 0 : 0.4} />
            ) : (
              0
            )}
          </div>
          <div className="font-stratum text-xs font-bold uppercase tracking-[0.3em] text-[var(--brand-intradark-primary)]">
            {armed ? (
              <StreamText
                text="Trusted"
                startDelay={reduced ? 0 : 1400}
                charDelay={60}
              />
            ) : (
              ""
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileSection({ reduced }: { reduced: boolean }) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>({ threshold: 0.15 });
  const shown = reduced || inView;

  return (
    <SectionShell index={5}>
      <div
        ref={ref}
        className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center"
      >
        <div className="space-y-6">
          {shown && (
            <>
              <Kicker index={5} label="Profiles" />
              <Headline>
                Every player.
                <br />
                <span className="text-[var(--brand-intradark-primary)]">
                  One dossier.
                </span>
              </Headline>
              <Lede>
                Steam, FACEIT, Leetify and Premier fused into one card — topped
                by Veritas, Intradark&apos;s own legitimacy score.
              </Lede>

              {/* Source badges */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-xs font-semibold text-amber-200">
                  <Crown className="size-3.5" /> Pro Player
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#0483c8]/40 bg-[#0483c8]/10 px-2.5 py-1.5 text-xs font-semibold text-[#7cc4ec]">
                  Premier{" "}
                  <b className="font-stratum italic tabular-nums">18,432</b>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#fd5a00]/40 bg-[#fd5a00]/10 px-2.5 py-1.5 text-xs font-semibold text-[#ff8a4c]">
                  FACEIT{" "}
                  <b className="font-stratum tabular-nums">Lvl 10 · 2,340</b>
                </span>
              </div>

              {/* Player DNA */}
              <div className="max-w-md space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
                    Leetify DNA
                  </span>
                  <span className="font-stratum text-sm font-bold text-emerald-400">
                    +3.14 overall
                  </span>
                </div>
                {DNA.map((d, i) => (
                  <AnimatedStat
                    key={d.label}
                    label={d.label}
                    value={d.value}
                    colorClass=""
                    progressMax={100}
                    decimals={0}
                    duration={reduced ? 0.01 : 2}
                    delay={reduced ? 0 : 0.2 + i * 0.12}
                    dataReady={shown}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Veritas */}
        <div className="flex flex-col items-center gap-5">
          {shown && (
            <>
              <VeritasRadial reduced={reduced} />
              <div className="grid grid-cols-2 gap-2">
                {VERITAS_AXES.map((axis, i) => (
                  <StaggeredAnimation
                    key={axis.label}
                    index={i}
                    fadeDirection="up"
                    chainFromZero
                    incrementDelay={0.09}
                    reducedMotion={reduced}
                  >
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: axis.color }}
                      />
                      <span className="text-xs font-medium text-white/60">
                        {axis.label}
                      </span>
                    </div>
                  </StaggeredAnimation>
                ))}
              </div>
              <p className="max-w-xs text-center text-[0.7rem] text-white/35">
                Drivers: 3-yr Steam account · FACEIT linked · Discord linked
              </p>
            </>
          )}
        </div>
      </div>
    </SectionShell>
  );
}
