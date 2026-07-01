"use client";

/**
 * Shared primitives + hooks for the /welcome onboarding reel.
 *
 * The reel is one authored "system boot": a single Merkaba star (owned by
 * welcome-reel) threads every section while each surface self-plays a micro-demo.
 * These primitives keep the sections visually consistent (kickers, headings,
 * chips, glass panels) and honor prefers-reduced-motion everywhere.
 */

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

/* ------------------------------------------------------------------ hooks */

/** True when the user asked for reduced motion. SSR-safe (false until mount). */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Fires once when the element scrolls into view — the trigger for a section's
 * scripted self-play loop, so off-screen sections stay idle. Under reduced
 * motion (or without IntersectionObserver) it reports visible immediately.
 */
export function useInViewOnce<T extends Element>(
  options?: IntersectionObserverInit,
): readonly [React.RefObject<T | null>, boolean] {
  const ref = React.useRef<T | null>(null);
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      options ?? { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [options]);
  return [ref, inView] as const;
}

/* ------------------------------------------------------------- primitives */

/** Per-section brand accent the docked star flashes as it scrolls in. */
export const SECTION_ACCENTS: readonly string[] = [
  "#4c9ccb", // 00 boot — brand light
  "#e0b04a", // 01 play — gold
  "#f97316", // 02 scrims — orange
  "#0483c8", // 03 tournaments — brand blue
  "#0483c8", // 04 utility — brand blue
  "#0483c8", // 05 profiles — brand blue
  "#0483c8", // 06 oceanic cs — brand blue
  "#4c9ccb", // 07 ignition — brand light (bloom)
];

/**
 * A full-height section slab. `welcome-reel` finds these via
 * `[data-welcome-section]` to drive the docked star's accent + chapter HUD.
 * Content is padded left on desktop so it clears the docked star rail.
 */
export function SectionShell({
  index,
  center = false,
  className,
  contentClassName,
  children,
}: {
  index: number;
  center?: boolean;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-welcome-section={index}
      className={cn(
        "relative z-10 flex min-h-svh w-full flex-col justify-center py-24",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-6xl px-6 md:pl-24 lg:pl-32",
          center && "flex flex-col items-center text-center md:pl-6 lg:pl-6",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** Thin uppercase mono chapter label, e.g. "01 / PLAY". */
export function Kicker({
  index,
  label,
  className,
}: {
  index: number;
  label: string;
  className?: string;
}) {
  const num = String(index).padStart(2, "0");
  return (
    <div
      className={cn(
        "flex items-center gap-3 font-mono text-[0.7rem] font-medium uppercase tracking-[0.35em] text-white/45",
        className,
      )}
    >
      <span className="tabular-nums text-white/70">{num}</span>
      <span className="h-px w-8 bg-white/20" />
      <span>{label}</span>
    </div>
  );
}

/** Oversized Stratum2 display headline that bleeds toward the left edge. */
export function Headline({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      className={cn(
        "font-stratum text-4xl font-black uppercase leading-[0.95] tracking-tight text-foreground drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)] sm:text-5xl md:text-6xl",
        className,
      )}
    >
      {children}
    </h2>
  );
}

/** Muted supporting paragraph under a headline. */
export function Lede({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "max-w-md text-pretty text-sm leading-relaxed text-white/55 sm:text-base",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** A small labelled stat pill (label over value). */
export function StatChip({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 backdrop-blur-sm",
        className,
      )}
    >
      <div className="font-stratum text-lg font-bold leading-none tabular-nums text-foreground">
        {value}
      </div>
      <div className="mt-1 text-[0.6rem] font-medium uppercase tracking-widest text-white/40">
        {label}
      </div>
    </div>
  );
}

/** A physical keycap glyph, e.g. Shift / Ctrl. */
export function Keycap({
  children,
  wide = false,
  className,
}: {
  children: React.ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-md border border-white/15 border-b-white/25 bg-gradient-to-b from-white/[0.08] to-white/[0.02] px-2 font-mono text-xs font-semibold text-white/80 shadow-[0_2px_0_rgba(255,255,255,0.06),0_4px_10px_rgba(0,0,0,0.5)]",
        wide ? "min-w-[3.5rem]" : "min-w-8",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** Frosted glass panel — the base surface for every module mock. */
export function GlassPanel({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      style={style}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The reserved gold CTA — with a one-shot sheen sweep and idle glow. Renders as
 * a button or, when `href` is set, an anchor.
 */
export function GoldCta({
  href,
  onClick,
  className,
  children,
}: {
  href?: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const classes = cn(
    "group/gold relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-7 py-3 font-stratum text-sm font-bold uppercase tracking-widest text-[#1a1206] transition-transform hover:scale-[1.03] active:scale-100",
    "bg-[linear-gradient(120deg,#ffe9a8,#e6b450_45%,#c19b33_70%,#8a6a24)] shadow-[0_10px_40px_-8px_rgba(224,176,74,0.6)]",
    className,
  );
  const inner = (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.65),transparent)] transition-transform duration-700 group-hover/gold:translate-x-full"
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </>
  );
  if (href) {
    return (
      <a href={href} onClick={onClick} className={classes}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {inner}
    </button>
  );
}

/** A ghost/secondary text link. */
export function GhostLink({
  href,
  onClick,
  className,
  children,
}: {
  href: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-white/45 underline-offset-4 transition-colors hover:text-white/80 hover:underline",
        className,
      )}
    >
      {children}
    </a>
  );
}
