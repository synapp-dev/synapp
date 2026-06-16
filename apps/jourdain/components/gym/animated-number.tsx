"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * A number that, on mount, slides + fades up into place while counting up from 0
 * to its value. Because it animates on mount, remounting it (e.g. when a card
 * gains focus) replays the whole thing from scratch.
 */
export function AnimatedNumber({
  value,
  suffix = "",
  decimals = 0,
  durationMs = 900,
  delayMs = 0,
  className,
  style,
  animate = true,
  enterFrom = "below",
}: {
  value: number;
  suffix?: string;
  /** Decimal places to render — e.g. 1 for a 62.5kg count-up. Defaults to 0. */
  decimals?: number;
  durationMs?: number;
  delayMs?: number;
  className?: string;
  style?: CSSProperties;
  /** When false, render the final value immediately with no count-up (used by
   *  muted, inactive cards that shouldn't re-animate). */
  animate?: boolean;
  /** Which way it slides into place: up from below (default) or down from above. */
  enterFrom?: "below" | "above";
}) {
  const [val, setVal] = useState(animate ? 0 : value);
  const [shown, setShown] = useState(!animate);
  const startRef = useRef(0);

  useEffect(() => {
    if (!animate) {
      setVal(value);
      setShown(true);
      return;
    }
    let raf = 0;
    startRef.current = 0;
    const begin = () => {
      setShown(true);
      const step = (ts: number) => {
        if (!startRef.current) startRef.current = ts;
        const t = Math.min(1, (ts - startRef.current) / durationMs);
        setVal(value * (1 - Math.pow(1 - t, 3)));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const to = setTimeout(begin, delayMs);
    return () => {
      clearTimeout(to);
      cancelAnimationFrame(raf);
    };
  }, [value, durationMs, delayMs, animate]);

  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        opacity: shown ? 1 : 0,
        transform: shown
          ? "translateY(0)"
          : enterFrom === "above"
            ? "translateY(-7px)"
            : "translateY(7px)",
        transition: "opacity 400ms ease-out, transform 400ms ease-out",
        ...style,
      }}
    >
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}
