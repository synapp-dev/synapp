"use client";

import { useEffect, useState } from "react";
import { SupersoltSpinner } from "@/components/branding/supersolt-spinner";
import {
  isSplashSidebarReady,
  markSplashPageIntro,
  onSplashSidebarReady,
} from "@/lib/splash-intro";

/**
 * First-load splash: the 3D tile logo draws itself in while spinning and the
 * wordmark letters trace on over the top of it. The splash holds until the
 * sidebar has all its data (scope, venues, nav — see lib/splash-intro.ts),
 * then everything UN-ANIMATES — letters un-trace last-to-first, the solid
 * deflates back to a flat outline drawing and traces itself away — while the
 * sidebar choreography plays underneath: panel slides in, logo, venue
 * switcher, then nav items rising in at an offset.
 *
 * Shown on every full document load (a hard refresh or the browser hitting
 * the site fresh); client-side navigations never replay it. Background
 * matches the resolved next-themes theme, stamped on <html> pre-paint so the
 * app never flashes before hydration. Skipped on /spinner-demo (that page
 * has its own Play button).
 *
 * - `SupersoltWordmarkDraw` — the staggered letter-draw wordmark, reusable;
 *   `phase="out"` plays it in reverse.
 * - `SupersoltSplash` — the overlay scene, controlled via `exiting`.
 * - `SupersoltSplashGate` — mounts in the root layout; owns the timing.
 */

const SPLASH_BG_DARK = "#0e0d0d";
const SPLASH_BG_LIGHT = "#fafafa";
const WORDMARK_DARK_INK = "#231f20";

// Gate timing: never exit before MIN_HOLD (lets the entrance land), exit as
// soon as the sidebar reports ready after that, bail out at MAX_HOLD on
// routes that never mount a sidebar (login), and unmount EXIT_MS after the
// exit choreography starts. EXIT_MS covers the whole sequence — the symbol's
// 1400ms un-draw AND the sidebar/page intro (page lands ~2400ms) — so
// nothing gets cut off.
const MIN_HOLD_MS = 3400;
const MAX_HOLD_MS = 7000;
const SYMBOL_DRAW_OUT_MS = 1400;
export const SPLASH_EXIT_MS = 2600;

// The nine letter paths of SUPER / SOLT, verbatim from
// supersolt-logowordmark-white.svg (viewBox 360 × 144, tile omitted).
const WORDMARK_VIEWBOX = "173 33 189 75";
const LETTER_PATHS = [
  // S U P E R
  "M182.92,56.01c0,3.09,2.51,4.52,12.04,4.52,7.9,0,10.29-.88,10.29-3.18,0-2.43-1.67-2.84-11.17-3.3-12.76-.59-17.82-2.59-17.82-9.16s6.57-8.49,17.52-8.49,17.73,2.76,17.73,10h-7.53c0-3.22-3.22-4.01-11.04-4.01-7.4,0-9.16.71-9.16,2.89s1.76,2.68,10.29,3.18c11.54.63,18.69,1.25,18.69,8.66,0,7.82-7.4,9.41-18.23,9.41-12,0-19.15-2.05-19.15-10.5h7.53Z",
  "M233.65,66.51c-12.88,0-18.4-4.89-18.4-15.1v-14.6h7.53v14.6c0,4.1,1.13,8.78,10.87,8.78s10.87-4.73,10.87-8.78v-14.6h7.53v14.6c0,10.16-5.56,15.1-18.4,15.1Z",
  "M289.4,47.57c0,6.52-4.56,10.71-11.21,10.71h-15.47v7.82h-7.53v-29.28h23c6.65,0,11.21,4.22,11.21,10.75ZM281.87,47.57c0-4.43-3.51-4.43-5.77-4.43h-13.38v8.82h13.38c2.26,0,5.77,0,5.77-4.39Z",
  "M299.65,42.8v5.94h23.42v5.44h-23.42v5.94h23.42v5.98h-30.95v-29.28h30.95v5.98h-23.42Z",
  "M353.64,57.39l5.4,8.7h-8.87l-4.73-7.82h-12.13v7.82h-7.53v-29.28h23c6.65,0,11.21,4.22,11.21,10.75,0,4.77-2.43,8.28-6.36,9.83ZM333.32,51.96h13.38c2.26,0,5.77,0,5.77-4.39s-3.51-4.43-5.77-4.43h-13.38v8.82Z",
  // S O L T
  "M182.92,94.55c0,3.09,2.51,4.52,12.04,4.52,7.9,0,10.29-.88,10.29-3.18,0-2.43-1.67-2.84-11.17-3.3-12.76-.59-17.82-2.59-17.82-9.16s6.57-8.49,17.52-8.49,17.73,2.76,17.73,10h-7.53c0-3.22-3.22-4.01-11.04-4.01-7.4,0-9.16.71-9.16,2.89s1.76,2.68,10.29,3.18c11.54.63,18.69,1.25,18.69,8.66,0,7.82-7.4,9.41-18.23,9.41-12,0-19.15-2.05-19.15-10.5h7.53Z",
  "M214.66,89.95c0-9.7,5.52-15.01,18.4-15.01s18.4,5.35,18.4,15.01-5.56,15.1-18.4,15.1-18.4-5.35-18.4-15.1ZM243.94,89.95c0-5.94-3.01-8.7-10.87-8.7s-10.87,2.72-10.87,8.7,3.05,8.78,10.87,8.78,10.87-2.8,10.87-8.78Z",
  "M284.3,98.31v6.32h-30.11v-29.28h7.53v22.96h22.58Z",
  "M312.53,81.67h-14.22v22.96h-7.53v-22.96h-14.22v-6.31h35.97v6.31Z",
];

const WORDMARK_KEYFRAMES = `
@keyframes ss-wm-rise {
  from { opacity: 0; transform: translateY(9px); }
  to { opacity: 1; transform: none; }
}
@keyframes ss-wm-draw {
  from { stroke-dashoffset: 1; }
  to { stroke-dashoffset: 0; }
}
@keyframes ss-wm-fill {
  from { fill-opacity: 0; stroke-opacity: 1; }
  to { fill-opacity: 1; stroke-opacity: 0; }
}
@keyframes ss-wm-sink {
  from { opacity: 1; transform: none; }
  to { opacity: 0; transform: translateY(9px); }
}
@keyframes ss-wm-undraw {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: 1; }
}
@keyframes ss-wm-unfill {
  from { fill-opacity: 1; stroke-opacity: 0; }
  to { fill-opacity: 0; stroke-opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .ss-wm g, .ss-wm path { animation-duration: 1ms !important; animation-delay: 0ms !important; }
}
`;

export interface SupersoltWordmarkDrawProps {
  className?: string;
  /** Letter colour. Default white (the dark-theme wordmark). */
  color?: string;
  /** "in" (default) draws the letters on; "out" un-draws them in reverse. */
  phase?: "in" | "out";
  /** Delay before the first letter starts, ms (in-phase only). Default 0. */
  startDelayMs?: number;
  /** Offset between one letter starting and the next, ms. Default 90. */
  staggerMs?: number;
}

/**
 * The SUPER / SOLT wordmark drawing itself on: each letter's outline traces
 * in (stroke-dashoffset over a normalised pathLength), then the fill blooms
 * as the stroke fades — with every letter slightly offset from the last, and
 * rising a few px as it lands. `phase="out"` reverses it: the fill drains
 * back to a stroke, the stroke un-traces and the letter sinks away, last
 * letter first.
 */
export function SupersoltWordmarkDraw({
  className,
  color = "#ffffff",
  phase = "in",
  startDelayMs = 0,
  staggerMs = 90,
}: SupersoltWordmarkDrawProps) {
  const count = LETTER_PATHS.length;
  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      className={`ss-wm ${className ?? ""}`}
      aria-label="Supersolt"
      role="img"
    >
      <style>{WORDMARK_KEYFRAMES}</style>
      {LETTER_PATHS.map((d, i) => {
        const out = phase === "out";
        const delay = out
          ? (count - 1 - i) * Math.round(staggerMs * 0.8)
          : startDelayMs + i * staggerMs;
        const groupAnimation = out
          ? `ss-wm-sink 480ms cubic-bezier(0.55, 0, 0.55, 0.2) ${delay + 380}ms both`
          : `ss-wm-rise 600ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both`;
        const pathAnimation = out
          ? `ss-wm-unfill 300ms ease ${delay}ms both, ss-wm-undraw 620ms ease ${delay + 220}ms both`
          : `ss-wm-draw 800ms ease ${delay}ms both, ss-wm-fill 600ms ease ${delay + 500}ms both`;
        return (
          <g key={i} style={{ animation: groupAnimation }}>
            <path
              d={d}
              pathLength={1}
              style={{
                stroke: color,
                fill: color,
                strokeWidth: 1.5,
                strokeDasharray: 1,
                animation: pathAnimation,
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}

export interface SupersoltSplashProps {
  /** Resolved theme for the backdrop and letter colours. Default dark. */
  theme?: "dark" | "light";
  /**
   * Flip to true to play the exit: the backdrop lifts while the spinner and
   * wordmark un-animate in place over the revealed app. The caller unmounts
   * the splash once the choreography is over (~1.9s).
   */
  exiting?: boolean;
}

/** The full-screen splash scene. The caller owns hold/exit timing. */
export function SupersoltSplash({
  theme = "dark",
  exiting = false,
}: SupersoltSplashProps) {
  const dark = theme === "dark";
  return (
    <div
      data-testid="supersolt-splash"
      aria-hidden
      className={`fixed inset-0 z-[9999] flex items-center justify-center ${
        exiting ? "pointer-events-none" : ""
      }`}
    >
      {/* Backdrop lifts early in the exit so the sidebar entrance shows
          through while the logo and wordmark are still un-animating. */}
      <div
        className="absolute inset-0 transition-opacity duration-[650ms] ease-out"
        style={{
          backgroundColor: dark ? SPLASH_BG_DARK : SPLASH_BG_LIGHT,
          opacity: exiting ? 0 : 1,
          transitionDelay: exiting ? "300ms" : "0ms",
        }}
      />
      {/* The lockup: spinning tile at left, wordmark to its right (matching
          the flat wordmark SVG's proportions — tile 150 : text 184 wide). */}
      <div className="relative flex flex-col items-center gap-3 sm:flex-row sm:gap-1">
        <SupersoltSpinner
          variant="tile"
          size={240}
          drawIn
          drawOut={exiting}
          drawOutDurationMs={SYMBOL_DRAW_OUT_MS}
          // Fast, then decelerating to a dead stop facing forward (1.5 turns
          // lands the tile square-on); the draw-out accelerates on from there.
          spinInRevolutions={1.5}
          spinOutRevolutions={1.5}
        />
        <SupersoltWordmarkDraw
          phase={exiting ? "out" : "in"}
          startDelayMs={1000}
          color={dark ? "#ffffff" : WORDMARK_DARK_INK}
          className="w-[min(260px,64vw)]"
        />
      </div>
    </div>
  );
}

// Runs synchronously during HTML parse, before first paint: on every full
// document load (except the demo page) resolve the next-themes theme from
// localStorage and stamp <html data-ss-splash="dark|light"> so the CSS
// backdrop below covers the page before React hydrates — no app flash.
// next-themes here uses defaultTheme "light", so no stored value = light.
const PREPAINT_SCRIPT = `try{if(location.pathname.indexOf("/spinner-demo")!==0){var t=null;try{t=localStorage.getItem("theme")}catch(e){}var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-ss-splash",d?"dark":"light")}}catch(e){}`;

// Backdrop + the strictly-sequential intro choreography. While the splash is
// up (data-ss-splash) the sidebar elements AND the page content wait at
// opacity 0; when the gate flips to data-ss-intro-play they come in one
// after another: the empty sidebar rectangle slides in first (0–550ms, its
// children still hidden), then the logo (550ms), the venue switcher (780ms),
// the menu items sliding in from the left at a stagger (1000ms + 60ms each),
// the help nav and user footer, and ONLY once the sidebar is completely
// finished does the page itself ([data-slot="sidebar-inset"]) fade up
// (1900ms). The backdrop also self-fades after 9s as a safety valve in case
// hydration never happens.
const NAV_STAGGER_BASE_MS = 1000;
const NAV_STAGGER_STEP_MS = 60;
const PAGE_ENTER_MS = 1900;
const navStaggerRules = Array.from({ length: 14 }, (_, i) => {
  const delay = NAV_STAGGER_BASE_MS + i * NAV_STAGGER_STEP_MS;
  return `html[data-ss-intro-play] .ss-intro-stagger ul[data-sidebar="menu"] > li:nth-child(${i + 1}) { animation-delay: ${delay}ms; }`;
}).join("\n");

const PREPAINT_CSS = `
html[data-ss-splash]::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: ${SPLASH_BG_DARK};
  animation: ss-splash-safety 400ms ease 9s forwards;
}
html[data-ss-splash="light"]::before { background: ${SPLASH_BG_LIGHT}; }
@keyframes ss-splash-safety { to { opacity: 0; visibility: hidden; } }

html[data-ss-splash] [data-slot="sidebar-container"],
html[data-ss-splash] [data-slot="sidebar-inset"],
html[data-ss-splash] [data-ss-intro],
html[data-ss-splash] .ss-intro-stagger ul[data-sidebar="menu"] > li { opacity: 0; }

/* While the sidebar slides/staggers in, its scroll body must not flash a
   vertical scrollbar as items animate through transform offsets. */
html[data-ss-splash] [data-slot="sidebar-content"],
html[data-ss-intro-play] [data-slot="sidebar-content"] { overflow: hidden !important; }

html[data-ss-intro-play] [data-slot="sidebar-container"] {
  animation: ss-intro-slide 550ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
html[data-ss-intro-play] [data-ss-intro] {
  animation: ss-intro-rise 350ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--ss-delay, 0ms);
}
html[data-ss-intro-play] .ss-intro-stagger ul[data-sidebar="menu"] > li {
  animation: ss-intro-item 400ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
${navStaggerRules}
html[data-ss-intro-play] [data-slot="sidebar-inset"] {
  animation: ss-intro-page 500ms cubic-bezier(0.22, 1, 0.36, 1) ${PAGE_ENTER_MS}ms both;
}
@keyframes ss-intro-slide {
  from { opacity: 0.4; transform: translateX(-100%); }
  to { opacity: 1; transform: none; }
}
@keyframes ss-intro-rise {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
@keyframes ss-intro-item {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: none; }
}
@keyframes ss-intro-page {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  html[data-ss-intro-play] [data-slot="sidebar-container"],
  html[data-ss-intro-play] [data-slot="sidebar-inset"],
  html[data-ss-intro-play] [data-ss-intro],
  html[data-ss-intro-play] .ss-intro-stagger ul[data-sidebar="menu"] > li {
    animation-duration: 1ms !important;
    animation-delay: 0ms !important;
  }
}
`;

/**
 * Mount once in the root layout. Plays the splash on every full document
 * load, holds until the sidebar reports ready (or MAX_HOLD), then runs the
 * exit + sidebar-intro choreography.
 */
export function SupersoltSplashGate() {
  const [phase, setPhase] = useState<"hidden" | "in" | "exiting">("hidden");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const root = document.documentElement;
    const stamped = root.getAttribute("data-ss-splash");
    if (stamped !== "dark" && stamped !== "light") return; // skipped route
    setTheme(stamped);
    setPhase("in");

    const started = Date.now();
    let exited = false;
    const timers: number[] = [];
    const exit = () => {
      if (exited) return;
      exited = true;
      // Swap attributes in one synchronous block: the backdrop rule ends and
      // the sidebar intro animations take over in the same style recalc.
      root.removeAttribute("data-ss-splash");
      root.setAttribute("data-ss-intro-play", "");
      setPhase("exiting");
      // Tell pages holding their entrance animations that the inset is
      // starting its fade-up, so their staggers play in view.
      timers.push(window.setTimeout(markSplashPageIntro, PAGE_ENTER_MS));
      timers.push(
        window.setTimeout(() => {
          root.removeAttribute("data-ss-intro-play");
          setPhase("hidden");
        }, SPLASH_EXIT_MS),
      );
    };
    const tryExit = () => {
      if (!isSplashSidebarReady()) return;
      const remaining = MIN_HOLD_MS - (Date.now() - started);
      if (remaining <= 0) exit();
      else timers.push(window.setTimeout(exit, remaining));
    };
    const unsubscribe = onSplashSidebarReady(tryExit);
    tryExit(); // sidebar may have reported ready before we mounted
    timers.push(window.setTimeout(exit, MAX_HOLD_MS));
    return () => {
      unsubscribe();
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PREPAINT_SCRIPT }} />
      <style>{PREPAINT_CSS}</style>
      {phase !== "hidden" && (
        <SupersoltSplash theme={theme} exiting={phase === "exiting"} />
      )}
    </>
  );
}
