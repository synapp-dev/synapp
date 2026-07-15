"use client";

import * as React from "react";

import {
  STREAM_CHARS_PER_TICK,
  STREAM_TICK_MS,
} from "@/entities/dashboard/components/superbot-suggestions-carousel-constants";

/**
 * Smooths bursty network streaming into a constant-rate character reveal
 * (same cadence as the agent chat / superbot carousel). Unlike
 * `useStreamingText`, it chases a *growing* buffer without restarting —
 * only a shrink (a fresh run) resets the reveal.
 */
export function useSmoothReveal(
  fullText: string,
  reduceMotion: boolean,
): number {
  const [visibleLen, setVisibleLen] = React.useState(0);

  // New run: the buffer was cleared (regenerate), start over.
  if (fullText.length < visibleLen) {
    setVisibleLen(0);
  }

  React.useEffect(() => {
    if (reduceMotion) {
      setVisibleLen(fullText.length);
      return;
    }
    if (visibleLen >= fullText.length) {
      return;
    }
    const id = window.setInterval(() => {
      setVisibleLen((current) =>
        Math.min(fullText.length, current + STREAM_CHARS_PER_TICK),
      );
    }, STREAM_TICK_MS);
    return () => window.clearInterval(id);
  }, [fullText, visibleLen, reduceMotion]);

  return reduceMotion ? fullText.length : Math.min(visibleLen, fullText.length);
}
