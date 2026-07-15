"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

/** Opacity fade-in when reticles mount (unless prefers-reduced-motion). */
const LINEUP_RETICLE_FADE_MS = 500;

const LINEUP_RETICLE_GREEN = "#39FF14";

/** Grid spans N steps per side to the frame edge; ticks and labels only when abs(k) is less than N (no outer ring). */
const RETICLE_X_STEPS_PER_SIDE = 5;
const RETICLE_Y_STEPS_PER_SIDE = 4;

function formatReticleStepLabel(k: number): string {
  return `${k}x`;
}

export function LineupReticlesOverlay({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean;
}) {
  const [fadeIn, setFadeIn] = React.useState(prefersReducedMotion);

  React.useEffect(() => {
    if (prefersReducedMotion) return;
    const id = requestAnimationFrame(() => setFadeIn(true));
    return () => cancelAnimationFrame(id);
  }, [prefersReducedMotion]);

  const vb = 100;
  const c = vb / 2;
  const tickMajor = 1.35;
  const stroke = LINEUP_RETICLE_GREEN;

  const xAt = (k: number) => c + (k / RETICLE_X_STEPS_PER_SIDE) * c;
  const yAt = (k: number) => c + (k / RETICLE_Y_STEPS_PER_SIDE) * c;

  /** Inner integer steps only — excludes ±N at the viewport edge (no notch, no label there). */
  const xInnerKs = Array.from(
    { length: (RETICLE_X_STEPS_PER_SIDE - 1) * 2 + 1 },
    (_, i) => i - (RETICLE_X_STEPS_PER_SIDE - 1),
  );
  const yInnerKs = Array.from(
    { length: (RETICLE_Y_STEPS_PER_SIDE - 1) * 2 + 1 },
    (_, i) => i - (RETICLE_Y_STEPS_PER_SIDE - 1),
  );

  return (
    <svg
      className={cn(
        "pointer-events-none absolute inset-0 z-10 h-full w-full",
        prefersReducedMotion
          ? "opacity-100"
          : cn(
              "ease-out transition-opacity",
              fadeIn ? "opacity-100" : "opacity-0",
            ),
      )}
      style={
        prefersReducedMotion
          ? undefined
          : { transitionDuration: `${LINEUP_RETICLE_FADE_MS}ms` }
      }
      viewBox={`0 0 ${vb} ${vb}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <g
        stroke={stroke}
        strokeWidth={0.22}
        strokeLinecap="square"
        vectorEffect="nonScalingStroke"
      >
        <line x1={0} y1={c} x2={vb} y2={c} />
        <line x1={c} y1={0} x2={c} y2={vb} />
        {xInnerKs.map((k) => (
          <line
            key={`xmaj-${k}`}
            x1={xAt(k)}
            y1={c - tickMajor}
            x2={xAt(k)}
            y2={c + tickMajor}
          />
        ))}
        {yInnerKs.map((k) => (
          <line
            key={`ymaj-${k}`}
            x1={c - tickMajor}
            y1={yAt(k)}
            x2={c + tickMajor}
            y2={yAt(k)}
          />
        ))}
      </g>
      <g
        fill={stroke}
        fontSize={2.55}
        fontFamily="ui-monospace, monospace"
        fontWeight="600"
        stroke="none"
      >
        {xInnerKs
          .filter((k) => k !== 0)
          .map((k) => (
            <text
              key={`xlab-${k}`}
              x={xAt(k)}
              y={c + 3.2}
              textAnchor="middle"
              dominantBaseline="hanging"
            >
              {formatReticleStepLabel(k)}
            </text>
          ))}
        {yInnerKs
          .filter((k) => k !== 0)
          .map((k) => (
            <text
              key={`ylab-${k}`}
              x={c + 3.4}
              y={yAt(k)}
              textAnchor="start"
              dominantBaseline="middle"
            >
              {formatReticleStepLabel(k)}
            </text>
          ))}
      </g>
    </svg>
  );
}
