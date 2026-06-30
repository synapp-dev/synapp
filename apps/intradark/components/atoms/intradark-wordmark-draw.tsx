"use client";

import { DrawFillSvg } from "@/components/atoms/draw-fill-svg";

/**
 * Animated Intradark wordmark. Each letter's outline strokes in left → right
 * (100ms apart) with a blue pen, then once all outlines are drawn the letters
 * fill white from the bottom up, one at a time. Built from the same paths as
 * `public/images/logos/intradark-wordmark-white.svg`.
 */

// The 10 glyph paths of the wordmark, in reading order: i n t r a d a r k ®.
const GLYPHS: string[] = [
  "M0,3.15C0,1.37,1.37,0,3.15,0c1.68,0,3.05,1.37,3.05,3.15s-1.37,3.16-3.05,3.16c-1.78,0-3.15-1.37-3.15-3.16ZM.76,10.84h4.63v27.89H.76V10.84Z",
  "M32.41,22.95c0-5.7-3.1-8.6-7.79-8.6s-7.99,2.95-7.99,8.96v15.42h-4.63V10.84h4.63v3.97c1.83-2.9,5.19-4.48,8.96-4.48,6.46,0,11.4,3.97,11.4,11.96v16.44h-4.58v-15.78Z",
  "M44.32,14.66h-3.61v-3.82h3.61V3.82h4.63v7.02h7.28v3.82h-7.28v16.44c0,2.75,1.02,3.71,3.87,3.71h3.41v3.92h-4.17c-4.94,0-7.73-2.04-7.73-7.63V14.66Z",
  "M65.18,38.73h-4.63V10.84h4.63v4.53c1.58-3.1,4.58-5.04,9.01-5.04v4.78h-1.22c-4.43,0-7.79,1.98-7.79,8.45v15.16Z",
  "M89.76,10.38c5.19,0,8.75,2.65,10.38,5.55v-5.09h4.68v27.89h-4.68v-5.19c-1.68,3-5.29,5.65-10.43,5.65-7.43,0-13.18-5.85-13.18-14.5s5.75-14.3,13.23-14.3ZM90.68,14.4c-5.09,0-9.41,3.71-9.41,10.28s4.33,10.43,9.41,10.43,9.47-3.82,9.47-10.38-4.38-10.33-9.47-10.33Z",
  "M122.07,10.08c3.72,0,7.28,1.73,9.21,4.38V1.07h7.23v37.66h-7.23v-4.17c-1.68,2.6-4.83,4.63-9.26,4.63-7.18,0-12.88-5.85-12.88-14.66s5.7-14.45,12.93-14.45ZM123.85,16.33c-3.82,0-7.43,2.85-7.43,8.19s3.61,8.4,7.43,8.4,7.48-2.95,7.48-8.29-3.56-8.29-7.48-8.29Z",
  "M155.25,10.08c4.53,0,7.63,2.14,9.31,4.48v-4.02h7.18v28.19h-7.18v-4.12c-1.68,2.44-4.88,4.58-9.36,4.58-7.12,0-12.82-5.85-12.82-14.66s5.7-14.45,12.87-14.45ZM157.08,16.33c-3.82,0-7.43,2.85-7.43,8.19s3.61,8.4,7.43,8.4,7.48-2.95,7.48-8.29-3.56-8.29-7.48-8.29Z",
  "M184.56,38.73h-7.12V10.53h7.12v4.38c1.78-2.9,4.73-4.78,8.65-4.78v7.48h-1.88c-4.22,0-6.77,1.63-6.77,7.07v14.04Z",
  "M196.72,1.07h7.12v21.42l9.46-11.96h9.26l-12.42,14.15,12.52,14.04h-9.26l-9.57-12.01v12.01h-7.12V1.07Z",
  "M227.06,34.83c0-2.28,1.62-3.89,3.89-3.89s3.87,1.61,3.87,3.89-1.61,3.87-3.87,3.87-3.89-1.63-3.89-3.87ZM228.07,34.83c0,1.75,1.11,2.94,2.89,2.94s2.9-1.19,2.9-2.94-1.13-2.96-2.9-2.96-2.89,1.19-2.89,2.96ZM231.94,35.24l.95,1.5h-1.42l-.79-1.37h-.11v1.37h-1.22v-3.91h1.92c.84,0,1.41.51,1.41,1.28,0,.53-.27.93-.73,1.13ZM230.55,33.88v.57h.58c.17,0,.31-.09.31-.29s-.15-.27-.31-.27h-.58Z",
];

export interface IntradarkWordmarkDrawProps {
  className?: string;
  /** Pen colour that traces the outlines. Default intradark blue. */
  strokeColor?: string;
  /** Fill colour that follows the pen. Default white. */
  fillColor?: string;
  /** Stroke width in viewBox units (logo is ~235 wide). Default 0.5. */
  strokeWidth?: number;
  /** Seconds between consecutive letters. Default 0.1 (100ms). */
  charOffset?: number;
  /** Seconds to trace one letter's outline. Default 0.4. */
  strokeDuration?: number;
  /** Seconds for one letter to fill bottom→top. Default 0.4. */
  fillDuration?: number;
  /** Seconds before the first letter starts. Default 0.2. */
  startDelay?: number;
  /** Change to replay from the start. */
  replayKey?: string | number;
}

export function IntradarkWordmarkDraw({
  className,
  strokeColor = "#0483c8",
  fillColor = "#ffffff",
  strokeWidth = 0.5,
  charOffset = 0.1,
  strokeDuration = 0.4,
  fillDuration = 0.4,
  startDelay = 0.2,
  replayKey,
}: IntradarkWordmarkDrawProps) {
  return (
    <DrawFillSvg
      className={className}
      viewBox="0 0 234.83 39.18"
      width={234.83}
      height={39.18}
      ariaLabel="Intradark"
      paths={GLYPHS.map((d) => ({ d, fill: fillColor }))}
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
