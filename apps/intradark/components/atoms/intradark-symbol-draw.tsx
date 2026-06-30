"use client";

import { DrawFillSvg, type DrawFillPath } from "@/components/atoms/draw-fill-svg";

/**
 * Animated Intradark star symbol — the same per-facet "stroke each one, then
 * fill from the bottom up" sequence as the wordmark, applied to the tri-tone
 * star. A white pen traces each facet (left → right, 100ms apart), then the
 * brand blues fill in one at a time. Built from the paths in
 * `public/images/logos/intradark-symbol-blue.svg`.
 */

const DARK = "#00497d";
const MID = "#0483c8";
const LIGHT = "#4c9ccb";

// Facet paths in document order, each with its brand shade.
const FACETS: DrawFillPath[] = [
  { fill: LIGHT, d: "M10.34,7.68l4.43-2.56-1.48,2.56-1.48,2.56h-5.91l4.43-2.56Z" },
  { fill: LIGHT, d: "M13.3,2.56l4.43-2.56-1.48,2.56-1.48,2.56h-5.91l4.43-2.56Z" },
  { fill: LIGHT, d: "M4.43,7.68l4.43-2.56-1.48,2.56-1.48,2.56H0l4.43-2.56Z" },
  { fill: DARK, d: "M10.34,12.8l-4.43-2.56h5.91l1.48,2.56,1.48,2.56-4.43-2.56Z" },
  { fill: DARK, d: "M4.43,12.8L0,10.23h5.91l1.48,2.56,1.48,2.56-4.43-2.55Z" },
  { fill: DARK, d: "M13.3,17.91l-4.43-2.56h5.91l1.48,2.56,1.48,2.56-4.43-2.56Z" },
  { fill: MID, d: "M14.78,10.24v-5.12l-1.48,2.56-1.48,2.56,1.48,2.56,1.48,2.56v-5.12Z" },
  { fill: MID, d: "M17.73,5.12V0l-1.48,2.56-1.48,2.56,1.48,2.56,1.48,2.56v-5.12Z" },
  { fill: MID, d: "M17.73,15.36v-5.12l-1.48,2.56-1.48,2.56,1.48,2.56,1.48,2.56v-5.12Z" },
  { fill: LIGHT, d: "M5.91,15.36v-5.12l4.43,2.56,4.43,2.56-4.43,2.56-4.43,2.56v-5.12Z" },
  { fill: MID, d: "M5.91,5.12V0l4.43,2.56,4.43,2.56-4.43,2.56-4.43,2.56v-5.12Z" },
  { fill: DARK, d: "M14.78,10.24v-5.12l4.43,2.56,4.43,2.56-4.43,2.56-4.43,2.56v-5.12Z" },
];

export interface IntradarkSymbolDrawProps {
  className?: string;
  /** Pen colour that traces the facets. Default white. */
  strokeColor?: string;
  /** Stroke width in viewBox units (symbol is ~24 wide). Default 0.3. */
  strokeWidth?: number;
  /** Seconds between consecutive facets. Default 0.1 (100ms). */
  charOffset?: number;
  /** Seconds to trace one facet's outline. Default 0.4. */
  strokeDuration?: number;
  /** Seconds for one facet to fill bottom→top. Default 0.4. */
  fillDuration?: number;
  /** Seconds before the first facet starts. Default 0.2. */
  startDelay?: number;
  /** Change to replay from the start. */
  replayKey?: string | number;
}

export function IntradarkSymbolDraw({
  className,
  strokeColor = "#ffffff",
  strokeWidth = 0.3,
  charOffset = 0.1,
  strokeDuration = 0.4,
  fillDuration = 0.4,
  startDelay = 0.2,
  replayKey,
}: IntradarkSymbolDrawProps) {
  return (
    <DrawFillSvg
      className={className}
      viewBox="0 0 23.64 20.47"
      width={23.64}
      height={20.47}
      ariaLabel="Intradark"
      paths={FACETS}
      strokeColor={strokeColor}
      strokeWidth={strokeWidth}
      charOffset={charOffset}
      strokeDuration={strokeDuration}
      fillDuration={fillDuration}
      startDelay={startDelay}
      replayKey={replayKey}
    />
  );
}
