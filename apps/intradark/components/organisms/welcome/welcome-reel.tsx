"use client";

/**
 * The /welcome onboarding reel shell.
 *
 * One persistent Merkaba star (a single WebGL context) threads the whole page:
 * hero-centered at boot, it docks into a sticky left rail as you scroll —
 * flashing each section's accent as that surface "comes online" — then
 * re-centers and blooms at the ignition CTA. The dock/bloom transform is written
 * straight to the DOM in a rAF scroll loop so the section tree never re-renders
 * per frame. Everything collapses to a legible static state under reduced motion.
 */

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

import { IntradarkSpinner } from "@/components/atoms/intradark-spinner";

import { WireframeBackground, type BgModel } from "./wireframe-background";
import { usePrefersReducedMotion, SECTION_ACCENTS } from "./welcome-ui";
import {
  BootHero,
  PlaySection,
  ProfileSection,
  ScrimsSection,
  TournamentsSection,
} from "./sections-early";
import {
  IgnitionSection,
  SceneSection,
  UtilitySection,
} from "./sections-late";

const STAR_SIZE = 660;

// The CS2 wireframe model that flies in + zooms per section (null = star owns it).
const BG_MODELS: (BgModel | null)[] = [
  null, // 00 boot — the star owns the hero
  { src: "/models/ak47.glb" }, // 01 play
  { src: "/models/player-t.glb", upright: true }, // 02 scrims
  { src: "/models/awp.glb" }, // 03 tournaments
  { src: "/models/smoke.glb", upright: true }, // 04 utility
  { src: "/models/player-ct.glb", upright: true }, // 05 profiles
  { src: "/models/karambit.glb" }, // 06 oceanic cs
  null, // 07 ignition — the star re-blooms
];
const HUD_LABELS = [
  "Boot",
  "Play",
  "Scrims",
  "Tournaments",
  "Utility",
  "Profiles",
  "Oceanic CS",
  "Ignition",
];

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

export function WelcomeReel({
  persona,
  personaAvatar,
  operatorNo = 4127,
}: {
  persona: string;
  personaAvatar?: string | null;
  operatorNo?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const starWrapRef = React.useRef<HTMLDivElement>(null);
  const glowRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(0);
  const [showHud, setShowHud] = React.useState(false);

  React.useEffect(() => {
    const starWrap = starWrapRef.current;
    const glow = glowRef.current;
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-welcome-section]"),
    );

    const applyGlow = (index: number, bloom: number) => {
      if (!glow) return;
      const accent =
        bloom > 0.5 ? "#4c9ccb" : SECTION_ACCENTS[index] ?? "#4c9ccb";
      glow.style.backgroundColor = accent;
      glow.style.opacity = String(0.16 + bloom * 0.22);
    };

    // A continuous rAF loop reads scroll position each frame — smoother than
    // scroll events and independent of them. setState only fires on change so
    // the section tree doesn't re-render per frame.
    let raf = 0;
    let mounted = true;
    let prevActive = -1;
    let prevHud: boolean | null = null;

    const frame = () => {
      if (!mounted) return;
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const y = window.scrollY;

      const dock = clamp(y / (vh * 0.6), 0, 1);

      let nextActive = 0;
      let best = Infinity;
      let bloom = 0;
      for (const el of sections) {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const dist = Math.abs(center - vh / 2);
        if (dist < best) {
          best = dist;
          nextActive = Number(el.dataset.welcomeSection ?? 0);
        }
      }
      const last = sections[sections.length - 1];
      if (last) {
        const r = last.getBoundingClientRect();
        bloom = clamp((vh * 0.85 - r.top) / (vh * 0.85), 0, 1);
      }

      if (nextActive !== prevActive) {
        prevActive = nextActive;
        setActive(nextActive);
      }
      const hud = dock > 0.02;
      if (hud !== prevHud) {
        prevHud = hud;
        setShowHud(hud);
      }

      if (starWrap) {
        const dockedX = -(vw / 2 - 72);
        if (reduced) {
          starWrap.style.transform = `translate3d(${dockedX}px,0,0) scale(0.16)`;
        } else {
          const effDock = dock * (1 - bloom);
          const tx = dockedX * effDock;
          const scaleDocked = 1 - 0.84 * dock; // 1 → 0.16
          const scale = scaleDocked + (1.12 - scaleDocked) * bloom;
          starWrap.style.transform = `translate3d(${tx}px,0,0) scale(${scale})`;
        }
      }
      applyGlow(nextActive, bloom);

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <div className="dark relative min-h-svh w-full overflow-x-clip bg-background text-foreground">
      {/* Persistent fixed background — never unmounts across the reel. */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-background" />

        <video
          aria-hidden
          className="absolute inset-0 size-full object-cover opacity-90"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        >
          <source src="/video/welcome-smoke-loop.webm" type="video/webm" />
          <source src="/video/welcome-smoke-loop.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/72" />

        {/* The one and only star. */}
        <div className="absolute inset-0 grid place-items-center">
          <div
            ref={starWrapRef}
            className="relative"
            style={{ width: STAR_SIZE, height: STAR_SIZE, willChange: "transform" }}
          >
            <div
              ref={glowRef}
              aria-hidden
              className="absolute inset-[12%] -z-10 rounded-full blur-3xl transition-colors duration-700"
              style={{ backgroundColor: "#4c9ccb", opacity: 0.16 }}
            />
            <IntradarkSpinner
              size={STAR_SIZE}
              speed={0.16}
              faceColor="background"
              strokeColor="#ffffff"
              strokeOpacity={1}
              strokeWidth={2}
              className="max-w-none [mask-image:radial-gradient(closest-side,black,transparent)]"
            />
          </div>
        </div>

        {/* Center vignette keeps hero + docked text legible over the bright core. */}
        <div className="absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,var(--background)_35%,transparent)]" />
      </div>

      {/* Per-section CS2 wireframe that flies in + zooms on scroll */}
      <WireframeBackground models={BG_MODELS} />

      {/* Chapter HUD */}
      <div
        className={cn(
          "fixed left-5 top-5 z-40 flex items-center gap-2.5 transition-opacity duration-500 sm:left-6 sm:top-6",
          showHud ? "opacity-100" : "opacity-0",
        )}
      >
        <span className="font-stratum text-2xl font-thin tabular-nums leading-none text-white/80">
          {String(active).padStart(2, "0")}
        </span>
        <span className="h-5 w-px bg-white/20" />
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-white/45">
          {HUD_LABELS[active] ?? ""}
        </span>
      </div>

      {/* Skip affordance — always reachable. */}
      <a
        href="/dashboard"
        onClick={() => {
          try {
            window.localStorage.setItem("intradark.welcome.seen", "1");
          } catch {
            /* ignore */
          }
        }}
        className="fixed right-5 top-5 z-40 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-white/45 backdrop-blur-sm transition-colors hover:text-white/80 sm:right-6 sm:top-6"
      >
        Skip →
      </a>

      {/* The reel */}
      <main className="relative z-10">
        <BootHero persona={persona} operatorNo={operatorNo} />
        <PlaySection
          persona={persona}
          personaAvatar={personaAvatar}
          reduced={reduced}
        />
        <ScrimsSection reduced={reduced} />
        <TournamentsSection reduced={reduced} />
        <UtilitySection reduced={reduced} />
        <ProfileSection reduced={reduced} />
        <SceneSection reduced={reduced} />
        <IgnitionSection reduced={reduced} />
      </main>
    </div>
  );
}
