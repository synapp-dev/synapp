"use client";

import { type CSSProperties, useId } from "react";

/**
 * Three dots that pulse in sequence, forever — the classic "thinking" /
 * loading ellipsis. Pairs with `StreamText` to read as "we're building…" with
 * the dots looping after the phrase streams in. Respects
 * `prefers-reduced-motion` (renders three static dots).
 */

export interface LoadingDotsProps {
  className?: string;
  /** ms before the dots start pulsing. Default 0. */
  startDelay?: number;
  /** ms for one full pulse cycle. Default 1400. */
  cycle?: number;
}

export function LoadingDots({
  className,
  startDelay = 0,
  cycle = 1400,
}: LoadingDotsProps) {
  const raw = useId();
  const id = `ld-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const kf = `${id}-pulse`;

  const css = `
@keyframes ${kf} {
  0%, 70%, 100% { opacity: 0.25; }
  35% { opacity: 1; }
}
.${id} > span {
  opacity: 0;
  animation: ${kf} ${cycle}ms ease-in-out infinite;
}
.${id} > span:nth-child(2) { animation-delay: calc(${startDelay}ms + ${Math.round(cycle / 6)}ms); }
.${id} > span:nth-child(3) { animation-delay: calc(${startDelay}ms + ${Math.round(cycle / 3)}ms); }
@media (prefers-reduced-motion: reduce) {
  .${id} > span { animation: none; opacity: 1; }
}
`;

  return (
    <span className={`${id}${className ? ` ${className}` : ""}`} aria-hidden>
      <style>{css}</style>
      <span style={{ animationDelay: `${startDelay}ms` } as CSSProperties}>.</span>
      <span>.</span>
      <span>.</span>
    </span>
  );
}
