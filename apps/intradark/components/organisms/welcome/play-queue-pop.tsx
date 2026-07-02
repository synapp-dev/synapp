"use client";

/**
 * The Play section preview: a self-cycling walkthrough of the whole PUG
 * pipeline — queue → accept → captains draft → Discord → veto → positions
 * (spots chosen on Mirage) → connect. Auto-advances on scroll-in and loops;
 * reduced motion holds a single representative frame.
 *
 * The roster is the signed-in operator (real Steam name + avatar) plus nine
 * dummy pros pulled from the player table (their aliases + stored avatars).
 */

import * as React from "react";
import Image from "next/image";
import CountUp from "react-countup";
import {
  Check,
  ChevronDown,
  Copy,
  Crown,
  MapPin,
  Server,
  Swords,
  Volume2,
} from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import { StaggeredAnimation } from "@/components/atoms/staggered-animation";

import { GlassPanel, useInViewOnce } from "./welcome-ui";

type Player = { name: string; avatar: string | null };

const PRO_BASE =
  "https://ujunmzeennmbbolmskdd.supabase.co/storage/v1/object/public/intradark-media/players/pro/";
// Nine dummy pros from the player table (b1t / kyousuke have no stored image → initials).
const PROS: Player[] = [
  { name: "donk", avatar: `${PRO_BASE}donk.jpg` },
  { name: "m0NESY", avatar: `${PRO_BASE}m0nesy.jpg` },
  { name: "NiKo", avatar: `${PRO_BASE}niko.png` },
  { name: "ZywOo", avatar: `${PRO_BASE}zywoo.jpg` },
  { name: "ropz", avatar: `${PRO_BASE}ropz.jpg` },
  { name: "sh1ro", avatar: `${PRO_BASE}sh1ro.jpg` },
  { name: "XANTARES", avatar: `${PRO_BASE}xantares.jpg` },
  { name: "b1t", avatar: null },
  { name: "kyousuke", avatar: null },
];

const STAGES = [
  { id: "queue", label: "Queue" },
  { id: "accept", label: "Ready Check" },
  { id: "draft", label: "Captains Draft" },
  { id: "discord", label: "Discord" },
  { id: "veto", label: "Map Veto" },
  { id: "positions", label: "Positions" },
  { id: "connect", label: "Connect" },
] as const;
const DURATIONS = [2200, 2600, 3200, 4400, 3400, 3000, 2600];

const VETO_MAPS = [
  { name: "Ancient", badge: "ancient" },
  { name: "Anubis", badge: "anubis" },
  { name: "Dust II", badge: "dust2" },
  { name: "Inferno", badge: "inferno" },
  { name: "Mirage", badge: "mirage" },
  { name: "Nuke", badge: "nuke" },
  { name: "Vertigo", badge: "vertigo" },
];
const VETO_BAN_ORDER = [6, 1, 5, 0, 2, 3]; // bans down to Mirage (index 4)

// Positions on Mirage (% coords from the reference); index is into teamA.
const POSITION_SPOTS = [
  { i: 1, spot: "B Anchor", x: 22, y: 29 },
  { i: 2, spot: "Short", x: 47, y: 30 },
  { i: 3, spot: "Window", x: 40, y: 46 },
  { i: 4, spot: "Connector", x: 50, y: 63 },
  { i: 0, spot: "A Anchor", x: 54, y: 78 },
];

function PlayerAvatar({
  player,
  className,
  style,
}: {
  player: Player;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (player.avatar) {
    return (
      // Plain <img> (not next/image) — loads the public Supabase avatar directly.
      // `max-w-none` overrides Tailwind preflight's `img{max-width:100%}`, which
      // otherwise caps the avatar against its shrink-to-fit wrapper → 0 width.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={player.avatar}
        alt=""
        style={style}
        className={cn(
          "block max-w-none shrink-0 rounded-full object-cover",
          className,
        )}
      />
    );
  }
  return (
    <span
      style={style}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-[#5865F2] font-bold uppercase leading-none text-white",
        className,
      )}
    >
      {player.name.slice(0, 1)}
    </span>
  );
}

export function PlayQueuePop({
  persona,
  personaAvatar,
  reduced,
}: {
  persona: string;
  personaAvatar?: string | null;
  reduced: boolean;
}) {
  const you: Player = React.useMemo(
    () => ({ name: persona || "operator", avatar: personaAvatar ?? null }),
    [persona, personaAvatar],
  );
  const teamA = React.useMemo(() => [you, ...PROS.slice(0, 4)], [you]);
  const teamB = React.useMemo(() => PROS.slice(4), []);

  const [rootRef, inView] = useInViewOnce<HTMLDivElement>({ threshold: 0.35 });
  const [stage, setStage] = React.useState(0);

  React.useEffect(() => {
    if (reduced) {
      setStage(5);
      return;
    }
    if (!inView) return;
    let idx = 0;
    setStage(0);
    let t = window.setTimeout(function advance() {
      idx = (idx + 1) % STAGES.length;
      setStage(idx);
      t = window.setTimeout(advance, DURATIONS[idx]);
    }, DURATIONS[0]);
    return () => window.clearTimeout(t);
  }, [inView, reduced]);

  const current = STAGES[stage]!.id;

  return (
    <div ref={rootRef} className="w-full">
      <style>{`
        @keyframes wc-accept-pop {
          0% { transform: scale(0.5); }
          60% { transform: scale(1.25); background-color:#10b981; }
          100% { transform: scale(1); background-color:#10b981; }
        }
        @keyframes wc-pos-pop {
          0% { transform: scale(0); opacity:0; }
          70% { transform: scale(1.3); }
          100% { transform: scale(1); opacity:1; }
        }
        @keyframes wc-beacon { 0% { transform:scale(0.8); opacity:.6 } 100% { transform:scale(3); opacity:0 } }
      `}</style>

      <GlassPanel className="flex min-h-[27rem] flex-col p-4">
        {/* Stage rail */}
        <div>
          <div className="flex items-center justify-between">
            <span className="font-stratum text-sm font-black uppercase tracking-widest text-foreground">
              {STAGES[stage]!.label}
            </span>
            <span className="tabular-nums text-xs font-semibold text-white/45">
              {stage + 1} / {STAGES.length}
            </span>
          </div>
          <div className="mt-2 flex gap-1">
            {STAGES.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors duration-300",
                  i < stage
                    ? "bg-[var(--brand-intradark-primary)]/60"
                    : i === stage
                      ? "bg-[var(--brand-intradark-primary)]"
                      : "bg-white/10",
                )}
              />
            ))}
          </div>
        </div>

        {/* Stage body — keyed so entrance animations replay each stage */}
        <div key={stage} className="relative mt-4 flex flex-1 flex-col">
          <StageBody
            stage={current}
            you={you}
            teamA={teamA}
            teamB={teamB}
            reduced={reduced}
          />
        </div>
      </GlassPanel>
    </div>
  );
}

function StageBody({
  stage,
  you,
  teamA,
  teamB,
  reduced,
}: {
  stage: (typeof STAGES)[number]["id"];
  you: Player;
  teamA: Player[];
  teamB: Player[];
  reduced: boolean;
}) {
  const anim = (i: number, dir: "up" | "left" = "up") => ({
    index: i,
    fadeDirection: dir,
    chainFromZero: true,
    incrementDelay: 0.08,
    reducedMotion: reduced,
  });

  if (stage === "queue") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <Image
          src="/images/logos/intradark-symbol-blue.svg"
          alt=""
          width={40}
          height={40}
          className={cn("size-9", !reduced && "animate-spin-slow")}
        />
        <div>
          <div className="font-stratum text-3xl font-black uppercase text-foreground">
            Searching
          </div>
          <div className="mt-1 text-xs uppercase tracking-widest text-white/45">
            Champions League · 5v5
          </div>
        </div>
        <div className="flex items-end gap-2 font-stratum">
          <span className="text-4xl font-black tabular-nums text-[var(--brand-intradark-primary)]">
            <CountUp start={6} end={10} duration={2} delay={0.2} />
          </span>
          <span className="pb-1 text-sm text-white/45">/ 10 players</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          {teamA.map((p, i) => (
            <StaggeredAnimation key={p.name} {...anim(i)}>
              <PlayerAvatar
                player={p}
                className="size-8 text-[0.6rem] ring-2 ring-sky-400/40"
              />
            </StaggeredAnimation>
          ))}
        </div>
      </div>
    );
  }

  if (stage === "accept") {
    return (
      <div className="flex flex-1 flex-col">
        <div className="text-center font-stratum text-lg font-black uppercase text-emerald-300">
          Match Found
        </div>
        <div className="mx-auto mt-2 h-1 w-full max-w-xs overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full bg-emerald-400"
            style={{ width: reduced ? "60%" : "0%" }}
            ref={(el) => {
              if (el && !reduced) {
                el.style.transition = "width 2.4s linear";
                requestAnimationFrame(() => (el.style.width = "100%"));
              }
            }}
          />
        </div>
        <div className="mt-4 grid flex-1 grid-cols-2 gap-2">
          {[
            { label: "Team A", team: teamA, tone: "sky" as const },
            { label: "Team B", team: teamB, tone: "orange" as const },
          ].map(({ label, team, tone }, ti) => (
            <div key={label} className="rounded-lg bg-black/30 p-2.5">
              <div
                className={cn(
                  "mb-1.5 text-[0.55rem] font-bold uppercase tracking-widest",
                  tone === "sky" ? "text-sky-400/80" : "text-orange-400/80",
                )}
              >
                {label}
              </div>
              <ul className="space-y-1.5">
                {team.map((p, i) => (
                  <li key={p.name} className="flex items-center gap-1.5 text-xs">
                    <PlayerAvatar player={p} className="size-5 text-[0.5rem]" />
                    <span
                      className={cn(
                        "flex-1 truncate",
                        p.name === you.name
                          ? "font-semibold text-foreground"
                          : "text-white/60",
                      )}
                    >
                      {p.name}
                    </span>
                    <span
                      className="grid size-4 shrink-0 place-items-center rounded-full bg-white/15"
                      style={
                        reduced
                          ? { backgroundColor: "#10b981" }
                          : {
                              animation: `wc-accept-pop 0.4s ease-out ${0.2 + (ti * 5 + i) * 0.12}s both`,
                            }
                      }
                    >
                      <Check
                        className="size-2.5 text-[#04140c]"
                        strokeWidth={3.5}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (stage === "draft") {
    // Captains are teamA[1] (donk) + teamB[0] (ropz); they draft everyone else.
    const picks = [
      { p: teamA[0]!, team: "A" }, // you
      { p: teamB[1]!, team: "B" },
      { p: teamA[2]!, team: "A" },
      { p: teamB[2]!, team: "B" },
      { p: teamA[3]!, team: "A" },
      { p: teamB[3]!, team: "B" },
      { p: teamA[4]!, team: "A" },
      { p: teamB[4]!, team: "B" },
    ];
    return (
      <div className="flex flex-1 flex-col">
        <div className="mb-2 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-md bg-sky-500/10 py-1.5">
            <Crown className="mx-auto size-3.5 text-sky-300" />
            <div className="text-[0.6rem] font-bold uppercase tracking-widest text-sky-300">
              Cpt. {teamA[1]!.name}
            </div>
          </div>
          <div className="rounded-md bg-orange-500/10 py-1.5">
            <Crown className="mx-auto size-3.5 text-orange-300" />
            <div className="text-[0.6rem] font-bold uppercase tracking-widest text-orange-300">
              Cpt. {teamB[0]!.name}
            </div>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2">
          {(["A", "B"] as const).map((side) => (
            <div key={side} className="space-y-1.5">
              {picks
                .filter((x) => x.team === side)
                .map((x, i) => (
                  <StaggeredAnimation
                    key={x.p.name}
                    index={side === "A" ? i * 2 : i * 2 + 1}
                    fadeDirection={side === "A" ? "right" : "left"}
                    chainFromZero
                    incrementDelay={0.16}
                    reducedMotion={reduced}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-2 py-1 text-xs",
                        side === "A"
                          ? "border-sky-400/25 bg-sky-400/[0.07]"
                          : "border-orange-400/25 bg-orange-400/[0.07]",
                      )}
                    >
                      <PlayerAvatar
                        player={x.p}
                        className="size-5 text-[0.5rem]"
                      />
                      <span
                        className={cn(
                          "truncate",
                          x.p.name === you.name
                            ? "text-foreground"
                            : "text-white/70",
                        )}
                      >
                        {x.p.name}
                      </span>
                    </div>
                  </StaggeredAnimation>
                ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (stage === "discord") {
    return <DiscordStage you={you} teamA={teamA} teamB={teamB} reduced={reduced} />;
  }

  if (stage === "veto") {
    return <VetoStage reduced={reduced} />;
  }

  if (stage === "positions") {
    return (
      <div className="flex flex-1 flex-col">
        <div className="mb-2 flex items-center justify-center gap-2 text-white/80">
          <MapPin className="size-4 text-[var(--brand-intradark-primary)]" />
          <span className="font-stratum text-sm font-black uppercase tracking-widest">
            Positions · Mirage
          </span>
        </div>
        <div className="grid flex-1 place-items-center">
          <div className="relative aspect-square w-full max-w-[19rem] overflow-hidden rounded-lg border border-white/10">
            <Image
              src="/radars/de_mirage.png"
              alt=""
              fill
              sizes="304px"
              className="object-cover opacity-70 contrast-110"
            />
            <span aria-hidden className="absolute inset-0 bg-black/25" />
            {POSITION_SPOTS.map((s, i) => {
              const p = teamA[s.i]!;
              const isYou = s.i === 0;
              const onRight = s.x <= 52;
              return (
                <div
                  key={s.spot}
                  className="absolute"
                  style={{ left: `${s.x}%`, top: `${s.y}%` }}
                >
                  {!reduced && (
                    <span
                      className="absolute left-0 top-0 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--brand-intradark-primary)]"
                      style={{
                        animation: `wc-beacon 1.8s ease-out ${0.3 + i * 0.3}s infinite`,
                      }}
                    />
                  )}
                  <span
                    className={cn(
                      "absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2",
                      isYou ? "ring-amber-400" : "ring-[var(--brand-intradark-primary)]",
                    )}
                    style={
                      reduced
                        ? undefined
                        : {
                            opacity: 0,
                            animation: `wc-pos-pop 0.42s ease-out ${0.3 + i * 0.3}s both`,
                          }
                    }
                  >
                    <PlayerAvatar player={p} className="size-5 text-[0.5rem]" />
                  </span>
                  <span
                    className={cn(
                      "absolute top-0 -translate-y-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[0.5rem] font-semibold tracking-wide text-white/90 ring-1 ring-white/10",
                      onRight ? "left-4" : "right-4",
                    )}
                    style={
                      reduced
                        ? undefined
                        : {
                            opacity: 0,
                            animation: `${onRight ? "slide-left-fade-in" : "slide-right-fade-in"} 0.4s ease-out ${0.55 + i * 0.3}s both`,
                          }
                    }
                  >
                    <b className="text-[var(--brand-intradark-primary)]">
                      {s.spot}
                    </b>
                    <span className="text-white/50">
                      {" "}
                      · {isYou ? "you" : p.name}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return <ConnectStage reduced={reduced} />;
}

/** Maps sit in a center column; each ban slides in a "Team A"/"Team B" tag on
 *  the side of the team that banned it. The lone survivor only picks up the
 *  blue "Decider" treatment once every other map has been banned. */
function VetoStage({ reduced }: { reduced: boolean }) {
  const [revealCount, setRevealCount] = React.useState(
    reduced ? VETO_BAN_ORDER.length : 0,
  );

  React.useEffect(() => {
    if (reduced) return;
    const timers = VETO_BAN_ORDER.map((_, step) =>
      window.setTimeout(
        () => setRevealCount((n) => Math.max(n, step + 1)),
        (0.4 + step * 0.42) * 1000,
      ),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [reduced]);

  const deciderRevealed = revealCount >= VETO_BAN_ORDER.length;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-3 text-center font-stratum text-sm font-black uppercase tracking-widest text-white/80">
        Alternating map bans
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1.5">
        {VETO_MAPS.map((m, i) => {
          const banStep = VETO_BAN_ORDER.indexOf(i);
          const banned = banStep >= 0 && banStep < revealCount;
          const isDecider = banStep === -1 && deciderRevealed;
          const team = banStep >= 0 ? (banStep % 2 === 0 ? "A" : "B") : null;
          return (
            <div
              key={m.name}
              className="grid grid-cols-[3.75rem_1fr_3.75rem] items-center gap-1.5"
            >
              <div className="flex justify-end">
                {banned && team === "A" && (
                  <span
                    className="rounded bg-sky-400/15 px-1 py-0.5 text-[0.5rem] font-bold uppercase text-sky-300"
                    style={{ animation: "slide-left-fade-in 0.3s ease-out both" }}
                  >
                    Team A
                  </span>
                )}
              </div>
              <div
                className={cn(
                  "flex items-center gap-2 rounded-md border px-2 py-1 transition-all duration-300",
                  isDecider
                    ? "border-[var(--brand-intradark-primary)]/60 bg-[var(--brand-intradark-primary)]/15"
                    : "border-white/10 bg-white/[0.03]",
                  banned && "opacity-30",
                )}
              >
                <Image
                  src={`/images/steam/maps/${m.badge}-badge.png`}
                  alt=""
                  width={20}
                  height={20}
                  className="h-6 w-auto object-contain"
                />
                <span
                  className={cn(
                    "flex-1 text-xs font-semibold uppercase tracking-wide",
                    banned && "line-through",
                    isDecider ? "text-[#9fd3f2]" : "text-white/70",
                  )}
                >
                  {m.name}
                </span>
                {isDecider && (
                  <span className="rounded bg-[var(--brand-intradark-primary)]/30 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase text-[#9fd3f2]">
                    Decider
                  </span>
                )}
              </div>
              <div className="flex justify-start">
                {banned && team === "B" && (
                  <span
                    className="rounded bg-orange-400/15 px-1 py-0.5 text-[0.5rem] font-bold uppercase text-orange-300"
                    style={{ animation: "slide-right-fade-in 0.3s ease-out both" }}
                  >
                    Team B
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A Discord-styled voice hub: 10 players start in Lobby, get pulled one-by-one
 *  into Team North / Team South, and randomly flare a green "speaking" ring. */
function DiscordStage({
  you,
  teamA,
  teamB,
  reduced,
}: {
  you: Player;
  teamA: Player[];
  teamB: Player[];
  reduced: boolean;
}) {
  const ALL = React.useMemo(() => [...teamA, ...teamB], [teamA, teamB]);
  const [moved, setMoved] = React.useState<Record<string, "north" | "south">>(
    {},
  );
  const [speaking, setSpeaking] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (reduced) {
      const m: Record<string, "north" | "south"> = {};
      teamA.forEach((p) => (m[p.name] = "north"));
      teamB.forEach((p) => (m[p.name] = "south"));
      setMoved(m);
      setSpeaking({ [teamA[1]!.name]: true, [teamB[2]!.name]: true });
      return;
    }
    setMoved({});
    setSpeaking({});
    const moves: [string, "north" | "south"][] = [];
    for (let i = 0; i < 5; i++) {
      moves.push([teamA[i]!.name, "north"]);
      moves.push([teamB[i]!.name, "south"]);
    }
    const timers = moves.map(([name, ch], i) =>
      window.setTimeout(
        () => setMoved((prev) => ({ ...prev, [name]: ch })),
        500 + i * 260,
      ),
    );
    const speak = window.setInterval(() => {
      const s: Record<string, boolean> = {};
      ALL.forEach((p) => {
        if (Math.random() < 0.35) s[p.name] = true;
      });
      setSpeaking(s);
    }, 550);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearInterval(speak);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  const lobby = ALL.filter((p) => !moved[p.name]);
  const north = teamA.filter((p) => moved[p.name] === "north");
  const south = teamB.filter((p) => moved[p.name] === "south");

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-black/50 bg-[#1e1f22]">
      <div className="flex items-center justify-between border-b border-black/40 px-2.5 py-1.5">
        <span className="flex items-center gap-1 text-sm font-semibold text-[#f2f3f5]">
          intradark <ChevronDown className="size-3.5 text-[#949ba4]" />
        </span>
        <span className="text-sm text-[#949ba4]">+</span>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-1.5">
        <DiscordChannel name="Lobby" count={lobby.length}>
          {lobby.map((p) => (
            <DiscordMember key={p.name} player={p} you={you} speaking={!!speaking[p.name]} />
          ))}
        </DiscordChannel>
        <DiscordChannel name="Team North" count={north.length}>
          {north.map((p) => (
            <DiscordMember
              key={p.name}
              player={p}
              you={you}
              speaking={!!speaking[p.name]}
              moving={!reduced}
            />
          ))}
        </DiscordChannel>
        <DiscordChannel name="Team South" count={south.length}>
          {south.map((p) => (
            <DiscordMember
              key={p.name}
              player={p}
              you={you}
              speaking={!!speaking[p.name]}
              moving={!reduced}
            />
          ))}
        </DiscordChannel>
      </div>
    </div>
  );
}

function DiscordChannel({
  name,
  count,
  children,
}: {
  name: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[0.72rem] font-medium text-[#949ba4]">
        <Volume2 className="size-3.5 shrink-0" />
        <span className="flex-1 truncate">{name}</span>
        {count > 0 && (
          <span className="text-[0.6rem] text-[#6d7178]">{count}</span>
        )}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function DiscordMember({
  player,
  you,
  speaking,
  moving = false,
}: {
  player: Player;
  you: Player;
  speaking: boolean;
  moving?: boolean;
}) {
  const isYou = player.name === you.name;
  return (
    <div
      className="flex items-center gap-2 rounded px-1.5 py-0.5 pl-5"
      style={
        moving
          ? { animation: "slide-left-fade-in 0.35s ease-out both" }
          : undefined
      }
    >
      <span
        className="rounded-full transition-shadow duration-150"
        style={{
          boxShadow: speaking
            ? "0 0 0 2px #1e1f22, 0 0 0 4px #23a55a"
            : undefined,
        }}
      >
        <PlayerAvatar player={player} className="size-6 text-[0.55rem]" />
      </span>
      <span
        className={cn(
          "truncate text-xs",
          speaking ? "text-[#dbdee1]" : "text-[#b5bac1]",
          isYou && "font-semibold text-white",
        )}
      >
        {player.name}
      </span>
    </div>
  );
}

function ConnectStage({ reduced }: { reduced: boolean }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <span
        className="grid size-14 place-items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
        style={
          reduced ? undefined : { animation: "orb-glow-bloom 1.4s ease-out both" }
        }
      >
        <Server className="size-6" />
      </span>
      <div className="font-stratum text-xl font-black uppercase text-emerald-300">
        Server ready
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard
            ?.writeText("connect play.intradark.mock:27015")
            .then(
              () => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              },
              () => {},
            );
        }}
        className="flex w-full max-w-xs items-center justify-between rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-emerald-300/90 transition-colors hover:border-emerald-400/40"
      >
        <span className="truncate">connect play.intradark.mock:27015</span>
        {copied ? (
          <Check className="size-3.5 shrink-0 text-emerald-400" />
        ) : (
          <Copy className="size-3.5 shrink-0 text-white/40" />
        )}
      </button>
      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2 font-stratum text-sm font-bold uppercase tracking-widest text-emerald-300">
        <Swords className="size-4" /> Enter server →
      </div>
    </div>
  );
}
