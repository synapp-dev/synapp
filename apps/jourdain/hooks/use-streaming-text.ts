"use client";

import { useEffect, useState } from "react";

// ~70 chars/sec — fast enough to feel snappy, slow enough to read as "typing".
const CHARS_PER_TICK = 2;
const TICK_MS = 28;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Progressively reveals `text` character-by-character (typewriter effect),
 * returning how many characters are currently visible. Slice the text with the
 * return value to render the streamed prefix.
 *
 * Resets and re-streams whenever `text` changes. When `enabled` is false the
 * length stays at 0; when the user prefers reduced motion the full text shows
 * immediately. Pass `delayMs` to hold at 0 before streaming begins — useful for
 * syncing the typewriter with a staggered entrance animation.
 */
export function useStreamingText(
  text: string,
  enabled: boolean,
  delayMs = 0
): number {
  const [visibleLen, setVisibleLen] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setVisibleLen(0);
      return;
    }
    if (prefersReducedMotion()) {
      setVisibleLen(text.length);
      return;
    }

    setVisibleLen(0);
    let n = 0;
    let interval = 0;
    const timeout = window.setTimeout(() => {
      interval = window.setInterval(() => {
        n = Math.min(text.length, n + CHARS_PER_TICK);
        setVisibleLen(n);
        if (n >= text.length) window.clearInterval(interval);
      }, TICK_MS);
    }, delayMs);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [text, enabled, delayMs]);

  return visibleLen;
}
