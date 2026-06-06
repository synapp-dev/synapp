"use client";

import * as React from "react";

/** Geometry shared by Discord + server phase timers (viewBox 200×200). */
const VIEWBOX = 200;
const CX = 100;
const CY = 100;
const OUTER_R = 52 * 1.4;
const OUTER_STROKE = Math.round(8 * 1.4);
const INNER_R = 61;
const INNER_STROKE = Math.round(6 * 1.4);

export type MatchLobbyConcentricRingsProps = {
  /** Outer arc fill 0–1 (e.g. roster fraction on server / Discord). */
  outerProgress: number;
  /** Inner countdown arc 0–1 (remaining / initial). */
  timerProgress: number;
  outerStrokeColor?: string;
  ariaLabel: string;
  children: React.ReactNode;
};

export function MatchLobbyConcentricRings({
  outerProgress,
  timerProgress,
  outerStrokeColor = "#7289DA",
  ariaLabel,
  children,
}: MatchLobbyConcentricRingsProps) {
  const COuter = 2 * Math.PI * OUTER_R;
  const CInner = 2 * Math.PI * INNER_R;
  const clamp = (p: number) => Math.min(1, Math.max(0, p));
  const dashOffsetOuter = COuter * (1 - clamp(outerProgress));
  const dashOffsetInner = -CInner * (1 - clamp(timerProgress));

  const outerTransform = `rotate(-90 ${CX} ${CY})`;
  const timerTransform = `rotate(-90 ${CX} ${CY})`;

  return (
    <div className="relative grid aspect-square w-full max-w-full place-items-center">
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="size-full max-h-full max-w-full"
        role="img"
        aria-label={ariaLabel}
      >
        <g transform={outerTransform}>
          <circle
            cx={CX}
            cy={CY}
            r={OUTER_R}
            fill="none"
            stroke="rgb(39 39 42)"
            strokeWidth={OUTER_STROKE}
          />
          <circle
            cx={CX}
            cy={CY}
            r={OUTER_R}
            fill="none"
            stroke={outerStrokeColor}
            strokeWidth={OUTER_STROKE}
            strokeLinecap="round"
            strokeDasharray={COuter}
            strokeDashoffset={dashOffsetOuter}
            className="transition-[stroke-dashoffset] duration-1000 linear"
          />
        </g>
        <g transform={timerTransform}>
          <circle
            cx={CX}
            cy={CY}
            r={INNER_R}
            fill="none"
            stroke="rgb(39 39 42)"
            strokeWidth={INNER_STROKE}
          />
          <circle
            cx={CX}
            cy={CY}
            r={INNER_R}
            fill="none"
            stroke="#ffffff"
            strokeWidth={INNER_STROKE}
            strokeLinecap="round"
            strokeDasharray={CInner}
            strokeDashoffset={dashOffsetInner}
            className="transition-[stroke-dashoffset] duration-1000 linear"
          />
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0 px-4 text-center">
        {children}
      </div>
    </div>
  );
}
