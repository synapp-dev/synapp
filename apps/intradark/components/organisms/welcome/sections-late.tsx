"use client";

/**
 * Welcome reel — sections 05–08 (Utility, Firehose, Scene, Ignition).
 * Scroll-gated self-play + reduced-motion end-states, same as sections-early.
 */

import * as React from "react";
import Image from "next/image";
import CountUp from "react-countup";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Flame,
  Gamepad2,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import { StreamText } from "@/components/atoms/stream-text";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import { DrawFillSvg } from "@/components/atoms/draw-fill-svg";
import { ThreeDCard } from "@/components/atoms/three-d-card";

import {
  GhostLink,
  GlassPanel,
  GoldCta,
  Headline,
  Keycap,
  Kicker,
  Lede,
  SectionShell,
  useInViewOnce,
} from "./welcome-ui";

/* ========================================================= 05 · UTILITY */

const GRENADE_FILTERS = ["All", "Smokes", "Molotovs", "Flashbangs", "HE"];
const UTIL_KEYCAPS: [string, string][] = [
  ["Shift", "lineup"],
  ["A", "stand"],
  ["D", "land"],
  ["Ctrl", "full"],
];

function ThrowLineRadar({ reduced }: { reduced: boolean }) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>({ threshold: 0.35 });
  const armed = reduced || inView;

  return (
    <div
      ref={ref}
      className="relative aspect-square w-full max-w-md overflow-hidden rounded-2xl border border-white/12 bg-black"
    >
      <style>{`
        @keyframes wc-throw-draw {
          0% { stroke-dashoffset: 120; }
          55% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>
      <Image
        src="/radars/de_mirage.png"
        alt="de_mirage radar"
        fill
        className="pointer-events-none object-cover opacity-40 contrast-125"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20"
      />

      {/* Throw arc */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
      >
        <path
          d="M30 72 Q40 50 58 40"
          fill="none"
          stroke="#4c9ccb"
          strokeWidth={0.9}
          strokeLinecap="round"
          strokeDasharray="4 3"
          pathLength={120}
          style={{
            strokeDashoffset: armed ? 0 : 120,
            animation:
              armed && !reduced
                ? "wc-throw-draw 3s ease-in-out infinite"
                : undefined,
          }}
        />
        {armed && !reduced && (
          <circle r="1.5" fill="#ffffff">
            <animateMotion
              dur="3s"
              repeatCount="indefinite"
              keyPoints="0;1;1"
              keyTimes="0;0.55;1"
              calcMode="linear"
              path="M30 72 Q40 50 58 40"
            />
          </circle>
        )}
      </svg>

      {/* Throw pin (T side) */}
      <span className="absolute left-[30%] top-[72%] -translate-x-1/2 -translate-y-1/2">
        <span className="grid size-5 place-items-center rounded-full border border-orange-400 bg-orange-500/30 font-mono text-[0.6rem] font-bold text-orange-200">
          1
        </span>
      </span>

      {/* Smoke land marker */}
      <span className="absolute left-[58%] top-[40%] -translate-x-1/2 -translate-y-1/2">
        {armed && !reduced && (
          <span className="absolute -inset-2 animate-utility-radar-beacon-ring rounded-full border border-white/40" />
        )}
        <span className="grid size-6 place-items-center rounded-full bg-white/85 shadow-[0_0_18px_rgba(255,255,255,0.7)]">
          <span className="size-3 rounded-full bg-white" />
        </span>
      </span>

      {/* Verified + air-travel HUD */}
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-500/15 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-widest text-sky-200 backdrop-blur-sm">
        <ShieldCheck className="size-3" /> Intradark verified
      </div>
      <div className="absolute bottom-3 right-3 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-right backdrop-blur-sm">
        <div className="font-stratum text-lg font-black tabular-nums text-foreground">
          {armed ? (
            <CountUp
              end={1.9}
              decimals={1}
              duration={reduced ? 0.01 : 1.9}
              suffix="s"
            />
          ) : (
            "0.0s"
          )}
        </div>
        <div className="text-[0.55rem] uppercase tracking-widest text-white/40">
          air-travel
        </div>
      </div>
    </div>
  );
}

export function UtilitySection({ reduced }: { reduced: boolean }) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>({ threshold: 0.15 });
  const shown = reduced || inView;

  return (
    <SectionShell index={4}>
      <div
        ref={ref}
        className="grid gap-10 lg:grid-cols-[1fr_minmax(0,1.15fr)] lg:items-center"
      >
        <div className="space-y-6">
          {shown && (
            <>
              <Kicker index={4} label="Utility" />
              <Headline>
                Every nade.
                <br />
                <span className="text-[var(--brand-intradark-primary)]">
                  Pinned to the pixel.
                </span>
              </Headline>
              <Lede>
                A per-map radar where every smoke, molly, flash and HE is pinned
                to its exact throw and land spot — with the exact stance and
                timing to hit it.
              </Lede>
              <div className="flex flex-wrap items-center gap-2">
                {UTIL_KEYCAPS.map(([key, label]) => (
                  <span key={key} className="flex items-center gap-1.5">
                    <Keycap wide={key.length > 1}>{key}</Keycap>
                    <span className="text-[0.65rem] uppercase tracking-widest text-white/40">
                      {label}
                    </span>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {GRENADE_FILTERS.map((f, i) => (
                  <StaggeredAnimation
                    key={f}
                    index={i}
                    fadeDirection="up"
                    chainFromZero
                    incrementDelay={0.06}
                    reducedMotion={reduced}
                  >
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest",
                        i === 1
                          ? "border-[var(--brand-intradark-primary)]/50 bg-[var(--brand-intradark-primary)]/15 text-[#9fd3f2]"
                          : "border-white/10 bg-white/5 text-white/55",
                      )}
                    >
                      {f}
                    </span>
                  </StaggeredAnimation>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-center">{shown && <ThrowLineRadar reduced={reduced} />}</div>
      </div>
    </SectionShell>
  );
}

/* ====================================================== 06 · OCEANIC CS */

const REACTIONS = ["👍", "❤️", "😂", "🔥", "😢"];
const FORUM_REPLIES = [
  { depth: 0, author: "b1t_enjoyer", text: "New Mirage smoke from T ramp is filthy", reacts: 12 },
  { depth: 1, author: "Nocturne", text: "one-way? or full block", reacts: 3 },
  { depth: 2, author: "b1t_enjoyer", text: "full block, jump-throw bind", reacts: 8 },
  { depth: 1, author: "coach_zk", text: "moving this to Strategy", reacts: 2 },
];
const TEAM_ROSTER = [
  { name: "Reaper", role: "IGL", leader: true },
  { name: "Havoc", role: "AWP" },
  { name: "Cobra", role: "Entry" },
  { name: "Zenith", role: "Support" },
  { name: "Vex", role: "Lurk" },
];

export function SceneSection({ reduced }: { reduced: boolean }) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>({ threshold: 0.15 });
  const shown = reduced || inView;

  return (
    <SectionShell index={6}>
      <div ref={ref} className="space-y-8">
        {shown && (
          <>
            <div className="space-y-4">
              <Kicker index={6} label="Oceanic CS" />
              <Headline>
                Oceanic CS,{" "}
                <span className="text-[var(--brand-intradark-primary)]">
                  in your feed.
                </span>
              </Headline>
              <Lede className="max-w-2xl">
                A Substack-grade newsroom, Reddit-style forums, and Steam-gated
                team workspaces that own their colors — the home of Oceanic
                Counter-Strike.
              </Lede>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {/* News masthead */}
              <GlassPanel className="border-white/12">
                <div className="relative h-36 overflow-hidden">
                  <Image
                    src="/radars/de_nuke.png"
                    alt=""
                    fill
                    className="object-cover opacity-40 grayscale"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-[#0b0b0c] via-[#0b0b0c]/40 to-transparent"
                  />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-orange-500/90 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-white">
                    <Flame className="size-3" /> Hot
                  </span>
                </div>
                <div className="-mt-8 space-y-2 px-4 pb-4">
                  <span className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/40">
                    Roster moves · 2h ago
                  </span>
                  <h3 className="font-stratum text-lg font-black uppercase leading-tight text-foreground">
                    Reaper joins vVv on trial
                  </h3>
                  <p className="line-clamp-2 text-xs text-white/50">
                    The Champions-tier IGL steps in ahead of the Genesis
                    qualifier. We break down the fit.
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex gap-1">
                      {REACTIONS.map((r) => (
                        <span
                          key={r}
                          className="grid size-6 place-items-center rounded-full border border-white/10 bg-white/5 text-xs transition-transform hover:scale-110"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                    <span className="text-[0.6rem] text-white/40">
                      <b className="text-white/70">2,148</b> views
                    </span>
                  </div>
                </div>
              </GlassPanel>

              {/* Forums reply-tree */}
              <GlassPanel className="border-white/12 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <MessageSquare className="size-4 text-[var(--brand-intradark-primary)]" />
                  <span className="font-stratum text-xs font-black uppercase tracking-widest text-white/80">
                    Strategy
                  </span>
                </div>
                <div className="space-y-2">
                  {FORUM_REPLIES.map((reply, i) => (
                    <StaggeredAnimation
                      key={i}
                      index={i}
                      fadeDirection="up"
                      chainFromZero
                      incrementDelay={0.09}
                      reducedMotion={reduced}
                    >
                      <div
                        className="border-l border-white/10 pl-3"
                        style={{ marginLeft: reply.depth * 14 }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#7cc4ec] animated-underline-1">
                            {reply.author}
                          </span>
                          <span className="text-[0.55rem] text-white/30">
                            · {reply.reacts} 🔥
                          </span>
                        </div>
                        <p className="text-xs leading-snug text-white/60">
                          {reply.text}
                        </p>
                      </div>
                    </StaggeredAnimation>
                  ))}
                </div>
              </GlassPanel>

              {/* Teams workspace */}
              <GlassPanel
                className="border-white/12"
                style={{ boxShadow: "inset 0 0 60px -20px #0483c8" }}
              >
                <div className="relative border-b border-white/10 p-4">
                  <span
                    aria-hidden
                    className="absolute inset-0 animate-glow-breathe opacity-60"
                    style={{
                      background:
                        "radial-gradient(120px 60px at 20% 0%, #0483c855, transparent)",
                    }}
                  />
                  <div className="relative flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-gradient-to-br from-[#0483c8] to-[#00497d] font-stratum text-sm font-black text-white">
                      vVv
                    </span>
                    <div>
                      <div className="font-stratum text-base font-black uppercase text-foreground">
                        Team vVv
                      </div>
                      <div className="flex gap-2 text-[0.55rem] uppercase tracking-widest text-white/40">
                        <span className="text-white/70">Home</span>
                        <span>Upcoming</span>
                        <span>Admin</span>
                      </div>
                    </div>
                  </div>
                </div>
                <ul className="p-3">
                  {TEAM_ROSTER.map((m, i) => (
                    <StaggeredAnimation
                      key={m.name}
                      index={i}
                      fadeDirection="up"
                      chainFromZero
                      incrementDelay={0.07}
                      reducedMotion={reduced}
                    >
                      <li className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs">
                        <span className="flex items-center gap-2">
                          <span className="grid size-5 place-items-center rounded-full bg-white/10 text-[0.55rem] font-bold text-white/70">
                            {m.name.slice(0, 1)}
                          </span>
                          <span className="font-medium text-white/80">
                            @{m.name}
                          </span>
                          {m.leader && (
                            <span className="rounded bg-amber-400/20 px-1 text-[0.5rem] font-bold uppercase text-amber-300">
                              Leader
                            </span>
                          )}
                        </span>
                        <span className="text-[0.6rem] uppercase tracking-widest text-white/35">
                          {m.role}
                        </span>
                      </li>
                    </StaggeredAnimation>
                  ))}
                </ul>
              </GlassPanel>
            </div>

            {/* "and more" — Theory / Callouts nod */}
            <div className="flex items-center gap-4 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-5">
              <DrawFillSvg
                viewBox="0 0 80 60"
                width={80}
                height={60}
                ariaLabel="Bombsite callout zone"
                className="h-14 w-auto shrink-0"
                strokeColor="#4c9ccb"
                strokeWidth={1}
                paths={[
                  { d: "M8 40 L20 12 L58 8 L72 30 L54 52 L18 50 Z", fill: "#0483c833" },
                ]}
              />
              <div>
                <div className="font-stratum text-sm font-black uppercase tracking-widest text-white/80">
                  …and more
                </div>
                <p className="text-xs text-white/45">
                  Theory &amp; Callouts — self-drawing map zones (
                  <StreamText
                    text="A Site"
                    startDelay={reduced ? 0 : 400}
                    charDelay={70}
                    className="text-[#9fd3f2]"
                  />
                  , CT Spawn), positions, and the deep strategy library.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </SectionShell>
  );
}

/* ======================================================= 07 · IGNITION */

const READINESS = [
  { label: "Steam", done: true },
  { label: "Discord", done: false },
  { label: "Role", done: false },
];
const FIRST_ACTIONS: {
  brand: "steam" | "faceit" | "leetify";
  title: string;
  sub: string;
  href: string;
  icon: React.ReactNode;
}[] = [
  {
    brand: "steam",
    title: "Set your role & league",
    sub: "Pick where you queue",
    href: "/play",
    icon: <Gamepad2 className="size-4" />,
  },
  {
    brand: "leetify",
    title: "Link Discord to queue",
    sub: "Required for match voice",
    href: "/settings",
    icon: <MessageSquare className="size-4" />,
  },
  {
    brand: "faceit",
    title: "Claim your team slug",
    sub: "Start a crew",
    href: "/teams",
    icon: <Users className="size-4" />,
  },
];

export function IgnitionSection({ reduced }: { reduced: boolean }) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>({ threshold: 0.3 });
  const shown = reduced || inView;

  const markSeen = () => {
    try {
      window.localStorage.setItem("intradark.welcome.seen", "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <SectionShell index={7} center>
      <style>{`
        @keyframes wc-tick-pop {
          0% { transform: scale(0.3); opacity: 0.4; }
          60% { transform: scale(1.3); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div ref={ref} className="flex flex-col items-center gap-8">
        {shown && (
          <>
            <Kicker index={7} label="Ignition" className="justify-center" />

            <h2 className="text-balance font-stratum text-4xl font-black uppercase leading-[0.95] tracking-tight drop-shadow-[0_2px_24px_rgba(0,0,0,0.7)] sm:text-6xl">
              <StreamText
                text="You're geared up. "
                startDelay={reduced ? 0 : 300}
                charDelay={40}
                className="text-foreground"
              />
              <StreamText
                text="Your queue is open."
                startDelay={reduced ? 0 : 900}
                charDelay={40}
                className="text-[var(--brand-intradark-primary)]"
              />
            </h2>

            {/* Readiness checklist */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {READINESS.map((item, i) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
                    item.done
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                      : "border-white/15 bg-white/5 text-white/50",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 place-items-center rounded-full",
                      item.done
                        ? "bg-emerald-500 text-[#04140c]"
                        : "border border-white/25",
                    )}
                    style={
                      item.done && !reduced
                        ? {
                            animation: `wc-tick-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.6 + i * 0.15}s both`,
                          }
                        : undefined
                    }
                  >
                    {item.done && <Check className="size-3" strokeWidth={3.5} />}
                  </span>
                  {item.label}
                </div>
              ))}
            </div>

            {/* First actions */}
            <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
              {FIRST_ACTIONS.map((a, i) => (
                <StaggeredAnimation
                  key={a.title}
                  index={i}
                  fadeDirection="up"
                  chainFromZero
                  incrementDelay={0.1}
                  reducedMotion={reduced}
                >
                  <ThreeDCard brand={a.brand} isStatic={reduced}>
                    <a
                      href={a.href}
                      onClick={markSeen}
                      className="flex h-full flex-col gap-2 rounded-xl border border-white/10 bg-[#0c0c0d] p-4 text-left transition-colors hover:border-white/25"
                    >
                      <span className="grid size-9 place-items-center rounded-lg bg-white/5 text-[var(--brand-intradark-primary)]">
                        {a.icon}
                      </span>
                      <span className="font-stratum text-sm font-bold uppercase tracking-wide text-foreground">
                        {a.title}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-white/45">
                        {a.sub} <ChevronRight className="size-3" />
                      </span>
                    </a>
                  </ThreeDCard>
                </StaggeredAnimation>
              ))}
            </div>

            {/* Primary CTA */}
            <div className="flex flex-col items-center gap-4 pt-2">
              <GoldCta href="/play" onClick={markSeen}>
                <Sparkles className="size-4" /> Enter Intradark
                <ArrowRight className="size-4" />
              </GoldCta>
              <div className="flex items-center gap-5">
                <GhostLink href="/dashboard" onClick={markSeen}>
                  Explore on your own
                </GhostLink>
                <GhostLink href="/dashboard" onClick={markSeen}>
                  Skip the tour
                </GhostLink>
              </div>
            </div>
          </>
        )}
      </div>
    </SectionShell>
  );
}
