"use client";

import { type CSSProperties, type ElementType, useId } from "react";

/**
 * Streams text in character-by-character — each glyph materialises out of a
 * soft blur, like tokens arriving from a model. Pure CSS (staggered per-char
 * `animation-delay`), so it's SSR-safe and cheap. Respects
 * `prefers-reduced-motion` (renders instantly, fully visible).
 */

export interface StreamTextProps {
  text: string;
  className?: string;
  /** Element to render as. Default "span". */
  as?: ElementType;
  /** ms between consecutive characters appearing. Default 42. */
  charDelay?: number;
  /** ms before the first character appears. Default 0. */
  startDelay?: number;
  /** ms each character takes to materialise. Default 300. */
  fadeDuration?: number;
  /**
   * Remount key — change this value to replay the stream from the start.
   */
  replayKey?: string | number;
}

export function StreamText({
  text,
  className,
  as,
  charDelay = 42,
  startDelay = 0,
  fadeDuration = 300,
  replayKey,
}: StreamTextProps) {
  const Tag = as ?? "span";
  const raw = useId();
  const id = `st-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const kf = `${id}-in`;

  const css = `
@keyframes ${kf} {
  from { opacity: 0; filter: blur(6px); }
  to { opacity: 1; filter: blur(0); }
}
.${id} > span {
  opacity: 0;
  display: inline;
  white-space: pre;
  animation: ${kf} ${fadeDuration}ms ease-out forwards var(--st-delay, 0ms);
}
@media (prefers-reduced-motion: reduce) {
  .${id} > span { animation: none; opacity: 1; filter: none; }
}
`;

  const chars = Array.from(text);

  return (
    <Tag key={replayKey} className={`${id}${className ? ` ${className}` : ""}`}>
      <style>{css}</style>
      {chars.map((ch, i) => (
        <span
          key={i}
          style={{ "--st-delay": `${startDelay + i * charDelay}ms` } as CSSProperties}
        >
          {ch}
        </span>
      ))}
    </Tag>
  );
}
