"use client";

import * as React from "react";

/** ~60 chars/s baseline; the backlog term catches up after network bursts. */
const TICK_MS = 24;
const BASE_CHARS_PER_TICK = 1.5;
const BACKLOG_CATCHUP_RATIO = 0.06;

/**
 * Smooths a chunked network stream into a steady character-by-character
 * reveal. `text` may grow over time (and reset to "" / shrink on a new
 * run); the visible slice always advances smoothly toward it, faster
 * when a large backlog builds up so it never falls hopelessly behind.
 *
 * `speed` multiplies the baseline reveal rate — replays of already-known
 * text (e.g. tab switches) read better a little quicker than a live stream.
 */
export function useSmoothStreamText(
  text: string,
  reduceMotion: boolean,
  speed = 1,
): { visibleText: string; caughtUp: boolean } {
  const [visibleLen, setVisibleLen] = React.useState(0);
  const carryRef = React.useRef(0);

  // New run: the incoming text no longer extends what we've revealed.
  React.useEffect(() => {
    setVisibleLen((len) => {
      if (len > text.length) {
        carryRef.current = 0;
        return 0;
      }
      return len;
    });
  }, [text]);

  React.useEffect(() => {
    if (reduceMotion) {
      setVisibleLen(text.length);
      return;
    }
    if (visibleLen >= text.length) {
      return;
    }
    // Advancing visibleLen re-runs this effect, so the interval behaves
    // like a self-stopping timeout chain: once caught up, nothing ticks.
    const id = window.setInterval(() => {
      setVisibleLen((len) => {
        const backlog = text.length - len;
        if (backlog <= 0) {
          return len;
        }
        const step =
          carryRef.current +
          BASE_CHARS_PER_TICK * speed +
          backlog * BACKLOG_CATCHUP_RATIO;
        const whole = Math.floor(step);
        carryRef.current = step - whole;
        return Math.min(text.length, len + Math.max(1, whole));
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [text, visibleLen, reduceMotion, speed]);

  return {
    visibleText: text.slice(0, visibleLen),
    caughtUp: visibleLen >= text.length,
  };
}
