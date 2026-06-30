"use client";

import { type CSSProperties, useEffect, useId, useState } from "react";

/**
 * Draws an SVG one path at a time in two phases:
 *   1. Stroke — each path's outline is traced (left → right order, staggered by
 *      `charOffset`) via `stroke-dashoffset` (CSS).
 *   2. Fill — once every outline is drawn, each path fills from the bottom up
 *      (same left → right order, staggered by `charOffset`); its blue outline
 *      fades out as the fill arrives, leaving a clean solid shape.
 *
 * Ordering is by each path's leading x, so "left → right" holds even when the
 * source paths aren't in visual order. The per-path bottom-up fill is driven by
 * SMIL clip rects (CSS animation inside `<clipPath>` is unreliable across
 * browsers); the stroke trace/fade is CSS. Respects `prefers-reduced-motion`.
 */

export interface DrawFillPath {
  d: string;
  /** Solid fill colour this path settles into. */
  fill: string;
}

export interface DrawFillSvgProps {
  viewBox: string;
  width: number;
  /** viewBox height — drives the vertical fill. */
  height: number;
  paths: DrawFillPath[];
  ariaLabel: string;
  className?: string;
  /** Pen (outline) colour. Default white. */
  strokeColor?: string;
  /** Stroke width in viewBox units. Default 0.5. */
  strokeWidth?: number;
  /** Seconds between consecutive paths (both phases). Default 0.1 (100ms). */
  charOffset?: number;
  /** Seconds to trace one path's outline. Default 0.4. */
  strokeDuration?: number;
  /** Seconds for one path to fill bottom→top. Default 0.4. */
  fillDuration?: number;
  /** Seconds before the first stroke starts. Default 0.2. */
  startDelay?: number;
  /** Change to replay from the start. */
  replayKey?: string | number;
}

/** Leading x of a path (its first move-to), for left→right ordering. */
function leadingX(d: string): number {
  const m = d.match(/[Mm]\s*(-?[\d.]+)/);
  return m ? parseFloat(m[1]!) : 0;
}

export function DrawFillSvg({
  viewBox,
  width,
  height,
  paths,
  ariaLabel,
  className,
  strokeColor = "#ffffff",
  strokeWidth = 0.5,
  charOffset = 0.1,
  strokeDuration = 0.4,
  fillDuration = 0.4,
  startDelay = 0.2,
  replayKey,
}: DrawFillSvgProps) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const raw = useId();
  const id = `dfs-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const drawKf = `${id}-draw`;
  const fadeKf = `${id}-fade`;

  if (reduced) {
    return (
      <svg
        key={replayKey}
        className={className}
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={ariaLabel}
      >
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.fill} />
        ))}
      </svg>
    );
  }

  // Rank each path by leading x → its position in the staggered sequence.
  const rank: number[] = [];
  paths
    .map((p, i) => ({ i, x: leadingX(p.d) }))
    .sort((a, b) => a.x - b.x || a.i - b.i)
    .forEach((o, pos) => {
      rank[o.i] = pos;
    });

  const n = paths.length;
  // Fill phase starts once the last outline has finished tracing.
  const fillPhase = startDelay + (n - 1) * charOffset + strokeDuration;
  const FILL_EASE = "0.45 0 0.55 1";

  const rootStyle = {
    "--dfs-stroke": strokeColor,
    "--dfs-sw": strokeWidth,
  } as CSSProperties;

  const css = `
.${id} .${id}-stroke {
  fill: none;
  stroke: var(--dfs-stroke);
  stroke-width: var(--dfs-sw);
  stroke-linejoin: round;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation:
    ${drawKf} ${strokeDuration}s ease-in-out forwards var(--dfs-draw-delay, 0s),
    ${fadeKf} ${fillDuration}s ease-in-out forwards var(--dfs-fade-delay, 0s);
}
@keyframes ${drawKf} { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes ${fadeKf} { from { stroke-opacity: 1; } to { stroke-opacity: 0; } }
`;

  return (
    <svg
      key={replayKey}
      className={`${id}${className ? ` ${className}` : ""}`}
      style={rootStyle}
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
    >
      <style>{css}</style>
      <defs>
        {paths.map((_, i) => (
          <clipPath key={i} id={`${id}-fill-${i}`}>
            <rect x="0" y={height} width={width} height="0">
              <animate
                attributeName="y"
                from={height}
                to="0"
                dur={`${fillDuration}s`}
                begin={`${(fillPhase + rank[i]! * charOffset).toFixed(3)}s`}
                fill="freeze"
                calcMode="spline"
                keyTimes="0;1"
                keySplines={FILL_EASE}
              />
              <animate
                attributeName="height"
                from="0"
                to={height}
                dur={`${fillDuration}s`}
                begin={`${(fillPhase + rank[i]! * charOffset).toFixed(3)}s`}
                fill="freeze"
                calcMode="spline"
                keyTimes="0;1"
                keySplines={FILL_EASE}
              />
            </rect>
          </clipPath>
        ))}
      </defs>

      {/* Phase 1: outlines trace in, then fade as their fill rises. */}
      {paths.map((p, i) => (
        <path
          key={i}
          className={`${id}-stroke`}
          d={p.d}
          pathLength={1}
          style={
            {
              "--dfs-draw-delay": `${(startDelay + rank[i]! * charOffset).toFixed(3)}s`,
              "--dfs-fade-delay": `${(fillPhase + rank[i]! * charOffset).toFixed(3)}s`,
            } as CSSProperties
          }
        />
      ))}

      {/* Phase 2: each fill rises bottom→top inside its own clip. */}
      {paths.map((p, i) => (
        <g key={i} clipPath={`url(#${id}-fill-${i})`}>
          <path d={p.d} fill={p.fill} />
        </g>
      ))}
    </svg>
  );
}
