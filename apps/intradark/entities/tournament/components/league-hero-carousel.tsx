"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

import { leagueIcon } from "../lib/league-icon";
import {
  usePrefersReducedMotion,
  useStreamingText,
} from "../lib/use-streaming-text";
import type { FeaturedLeague } from "../types";

const ROTATE_MS = 10_000;
const FADE_MS = 650;

/** Blinking caret shown at the streaming text's leading edge. */
function Caret() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[1px] animate-pulse bg-current align-baseline"
    />
  );
}

function formatPrize(amount: string | null, currency: string | null): string | null {
  if (!amount) return null;
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${currency === "USD" || !currency ? "$" : `${currency} `}${n.toLocaleString()}`;
}

/**
 * Full-bleed hero that cross-fades through the PUG leagues every 10s.
 * Left: emblem + title + player count animating up. Right: top-5 leaderboard.
 */
export function LeagueHeroCarousel({ leagues }: { leagues: FeaturedLeague[] }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const goTo = useCallback(
    (next: number) => {
      if (leagues.length < 2) return;
      clearTimers();
      setVisible(false); // fade current info out
      timers.current.push(
        setTimeout(() => {
          setIndex(((next % leagues.length) + leagues.length) % leagues.length);
          setVisible(true); // fade next info in
        }, FADE_MS),
      );
    },
    [leagues.length],
  );

  // Auto-rotate.
  useEffect(() => {
    if (leagues.length < 2) return;
    const id = setTimeout(() => goTo(index + 1), ROTATE_MS);
    return () => clearTimeout(id);
  }, [index, leagues.length, goTo]);

  useEffect(() => clearTimers, []);

  const reduceMotion = usePrefersReducedMotion();
  const league = leagues[index] ?? leagues[0]!;
  const title = league?.name ?? "";
  const description = league?.description ?? "";

  // Stream the title first, then the description once the title finishes.
  const titleLen = useStreamingText(title, league?.slug ?? "", reduceMotion, visible);
  const titleDone = reduceMotion || titleLen >= title.length;
  const descLen = useStreamingText(
    description,
    league?.slug ?? "",
    reduceMotion,
    visible && titleDone,
  );
  const descDone = reduceMotion || descLen >= description.length;

  if (leagues.length === 0) return null;

  const emblem = leagueIcon(league.slug);
  const prize = formatPrize(league.prizePool, league.prizeCurrency);
  const enter = "transition-all duration-700 ease-out";
  const shown = visible
    ? "translate-y-0 opacity-100"
    : "translate-y-4 opacity-0";

  return (
    <section
      aria-label="Featured PUG leagues"
      className="relative h-[420px] w-full overflow-hidden rounded-t-2xl border border-b-0 bg-[#05070f] sm:h-[500px]"
    >
      {/* Shared looping background video (muted, autoplay). */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden
      >
        <source src="/video/abstract-dots-blue.webm" type="video/webm" />
        <source src="/video/abstract-dots-blue.mp4" type="video/mp4" />
      </video>

      {/* Top→bottom fade into the page background for a seamless blend */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background" />
      {/* Extra left scrim so the title stays legible over bright sky */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/10 to-transparent" />

      <div className="relative flex h-full items-end justify-between gap-6 p-6 sm:p-8">
        {/* Bottom-left: emblem, title, description, players */}
        <Link
          href={`/tournaments/${league.slug}`}
          className={cn("group flex items-end gap-5 sm:gap-7", enter, shown)}
        >
          {emblem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={emblem}
              alt=""
              className="size-28 shrink-0 object-contain drop-shadow-[0_4px_24px_rgba(0,0,0,0.65)] transition-transform group-hover:scale-105 sm:size-44"
            />
          ) : null}
          <div className="min-w-0 max-w-xl pb-1">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                PUG League
              </Badge>
              {prize ? (
                <span className="rounded-md bg-amber-400/90 px-2.5 py-1 text-base font-bold text-amber-950">
                  {prize}
                </span>
              ) : null}
            </div>
            <h2 className="text-4xl font-bold leading-[1.05] tracking-tight text-white drop-shadow-md sm:text-6xl">
              {title.slice(0, titleLen)}
              {!titleDone ? <Caret /> : null}
            </h2>
            {description ? (
              <p className="mt-3 min-h-[1.5em] text-base text-white/70 sm:text-lg">
                {description.slice(0, descLen)}
                {titleDone && !descDone ? <Caret /> : null}
              </p>
            ) : null}
            <div className="mt-4 flex items-center gap-2 text-base text-white/80">
              <span className="size-2.5 rounded-full bg-emerald-400" />
              <span className="text-lg font-semibold text-white">
                {league.entrantCount}
              </span>
              players
            </div>
          </div>
        </Link>

        {/* Right: top-5 leaderboard */}
        <div
          className={cn(
            "hidden w-80 shrink-0 rounded-xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm md:block",
            enter,
            shown,
          )}
        >
          <div className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-wide text-white/60">
            Top players
          </div>
          {league.leaders.length === 0 ? (
            <p className="px-1 py-3 text-sm text-white/50">
              No standings yet — season is just getting started.
            </p>
          ) : (
            <ol className="space-y-1">
              {league.leaders.map((p) => (
                <li
                  key={`${p.rank}-${p.name}`}
                  className="flex items-center gap-3 rounded-md px-1 py-1.5 text-[15px]"
                >
                  <span className="w-5 shrink-0 text-center font-bold text-white/40 tabular-nums">
                    {p.rank}
                  </span>
                  {p.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.avatar}
                      alt=""
                      className="size-7 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="size-7 shrink-0 rounded-full bg-white/10" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-white/90">
                    {p.name}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-white">
                    {Number(p.points).toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Slide indicators */}
      {leagues.length > 1 ? (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {leagues.map((l, i) => (
            <button
              key={l.slug}
              type="button"
              aria-label={`Show ${l.name}`}
              onClick={() => goTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70",
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
