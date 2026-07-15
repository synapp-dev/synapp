"use client";

import { useEffect, useState } from "react";

/**
 * Lightweight 2D cousin of the three.js {@link SupersoltSpinner} — the brand
 * "S" mark (two round-capped bars, verbatim from supersolt-logo-black.svg)
 * that draws itself on like a spinning coin, then settles facing forward.
 *
 * The 3D spinner is gorgeous but each instance owns a WebGL context, so a grid
 * of them would blow past the browser's context ceiling. This version is pure
 * SVG + CSS — a `rotateY` under a `perspective` parent for the coin spin, and
 * the same `pathLength={1}` stroke-dashoffset trace + fill-bloom the wordmark
 * uses — so one can sit on every skeleton card at no GPU cost.
 *
 * Choreography, matching the 3D mark's draw-in:
 *   phase "in"   → the outline traces on (fast decelerating spin), then the
 *                  fill blooms as the stroke fades and it lands facing forward,
 *                  then it drops into a gentle idle wobble ("still loading").
 *   phase "out"  → the reverse: fill drains back to a stroke, the stroke
 *                  un-traces, and it spins away and fades to nothing.
 *
 * Drive it with `exiting`: false plays "in" then idles; flip to true and it
 * plays "out". The in→idle handoff is internal (a timer), so the caller only
 * owns the in/out flip.
 */

const BRAND_GREEN = "#bcdb8b";

// The two green S-bars, verbatim from supersolt-logo-black.svg. viewBox cropped
// to the S bounds (the tile is omitted) with a little breathing room.
// Exported so other SVG contexts (e.g. the sales hero forecast bars) can
// render the raw mark without mounting this whole draw-in component.
export const MARK_VIEWBOX = "33 33 84 78";
export const BAR_PATHS = [
  "M55.41,35.74c-10.02,0-18.13,8.12-18.13,18.13s8.12,18.13,18.13,18.13h57.96v-36.27h-57.96Z",
  "M95.13,71.99c10.02,0,18.13,8.12,18.13,18.13s-8.12,18.13-18.13,18.13h-57.96v-36.27h57.96Z",
];

// Draw-in timeline. The spin runs the whole duration (fast → dead stop facing
// forward); the trace fills the front, the fill blooms as it settles.
export const MARK_IN_MS = 1400;
export const MARK_OUT_MS = 900;

const IN_KEYFRAMES = `
@keyframes ss-mark-spin-in {
  from { transform: rotateY(430deg); }
  to { transform: rotateY(0deg); }
}
@keyframes ss-mark-trace-in {
  from { stroke-dashoffset: 1; }
  to { stroke-dashoffset: 0; }
}
@keyframes ss-mark-fill-in {
  from { fill-opacity: 0; stroke-opacity: 0.9; }
  to { fill-opacity: 1; stroke-opacity: 0; }
}
@keyframes ss-mark-idle {
  0%, 100% { transform: rotateY(-11deg); }
  50% { transform: rotateY(11deg); }
}
`;

const OUT_KEYFRAMES = `
@keyframes ss-mark-spin-out {
  from { transform: rotateY(0deg); opacity: 1; }
  70% { opacity: 1; }
  to { transform: rotateY(-380deg); opacity: 0; }
}
@keyframes ss-mark-unfill {
  from { fill-opacity: 1; stroke-opacity: 0; }
  to { fill-opacity: 0; stroke-opacity: 0.9; }
}
@keyframes ss-mark-untrace {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: 1; }
}
`;

const REDUCED_MOTION = `
@media (prefers-reduced-motion: reduce) {
  .ss-mark-draw *, .ss-mark-draw { animation-duration: 1ms !important; animation-delay: 0ms !important; }
}
`;

export interface SupersoltMarkDrawProps {
  /** Pixel size of the (square) mark. Default 72. */
  size?: number;
  /** Mark colour. Default brand green. */
  color?: string;
  /**
   * false (default) plays the draw-in then idles; flip to true to play the
   * reverse draw-out. The in→idle handoff is internal.
   */
  exiting?: boolean;
  /** Delay before the draw-in starts, ms. Lets the card border trace first. */
  startDelayMs?: number;
}

export function SupersoltMarkDraw({
  size = 72,
  color = BRAND_GREEN,
  exiting = false,
  startDelayMs = 0,
}: SupersoltMarkDrawProps) {
  // in → idle handoff. Once exiting, we stay in the out branch regardless.
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (exiting) return;
    const t = window.setTimeout(() => setIdle(true), startDelayMs + MARK_IN_MS);
    return () => window.clearTimeout(t);
  }, [exiting, startDelayMs]);

  const spinAnimation = exiting
    ? `ss-mark-spin-out ${MARK_OUT_MS}ms cubic-bezier(0.5, 0, 0.75, 0) both`
    : idle
      ? `ss-mark-idle 3400ms ease-in-out infinite`
      : `ss-mark-spin-in ${MARK_IN_MS}ms cubic-bezier(0.16, 1, 0.3, 1) ${startDelayMs}ms both`;

  const pathAnimation = exiting
    ? `ss-mark-unfill 280ms ease both, ss-mark-untrace ${MARK_OUT_MS - 220}ms ease 220ms both`
    : idle
      ? "none"
      : `ss-mark-trace-in 640ms ease-out ${startDelayMs}ms both, ss-mark-fill-in 520ms ease ${startDelayMs + MARK_IN_MS - 520}ms both`;

  // Idle: fully drawn, no stroke — the trace/fill animations are gone, so pin
  // the resting state explicitly.
  const pathStaticStyle = idle
    ? { fillOpacity: 1, strokeOpacity: 0 }
    : undefined;

  return (
    <div
      className="ss-mark-draw"
      style={{ width: size, height: size, perspective: size * 3 }}
      role="status"
      aria-label="Loading"
    >
      <svg
        viewBox={MARK_VIEWBOX}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        style={{
          transformStyle: "preserve-3d",
          animation: spinAnimation,
          overflow: "visible",
        }}
        aria-hidden
      >
        <style>{`${IN_KEYFRAMES}${OUT_KEYFRAMES}${REDUCED_MOTION}`}</style>
        {BAR_PATHS.map((d, i) => (
          <path
            key={i}
            d={d}
            pathLength={1}
            style={{
              fill: color,
              stroke: color,
              strokeWidth: 2,
              strokeDasharray: 1,
              vectorEffect: "non-scaling-stroke",
              animation: pathAnimation,
              ...pathStaticStyle,
            }}
          />
        ))}
      </svg>
    </div>
  );
}
