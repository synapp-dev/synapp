"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_DURATION_MS = 1100;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Animates a value 0 to target over the duration, optionally after a delay. */
export function useCountUp(
  target: number,
  opts?: { duration?: number; delay?: number }
): number {
  const duration = opts?.duration ?? DEFAULT_DURATION_MS;
  const delay = opts?.delay ?? 0;
  const [val, setVal] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    startRef.current = 0;
    setVal(0);
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      setVal(target * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    const timeout = setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);

  return val;
}
