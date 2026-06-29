import * as React from "react";

const STREAM_CHARS_PER_TICK = 2;
const STREAM_TICK_MS = 22;

/**
 * Typewriter reveal: returns how many characters of `fullText` are currently
 * visible. Restarts whenever `runKey` changes. Ported from supersolt.
 */
export function useStreamingText(
  fullText: string,
  runKey: string,
  reduceMotion: boolean,
  enabled: boolean,
): number {
  const [visibleLen, setVisibleLen] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) {
      setVisibleLen(0);
      return;
    }
    if (reduceMotion) {
      setVisibleLen(fullText.length);
      return;
    }
    setVisibleLen(0);
    let n = 0;
    const id = window.setInterval(() => {
      n = Math.min(fullText.length, n + STREAM_CHARS_PER_TICK);
      setVisibleLen(n);
      if (n >= fullText.length) window.clearInterval(id);
    }, STREAM_TICK_MS);
    return () => window.clearInterval(id);
  }, [enabled, fullText, runKey, reduceMotion]);

  return visibleLen;
}

/** Tracks the user's prefers-reduced-motion setting. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
