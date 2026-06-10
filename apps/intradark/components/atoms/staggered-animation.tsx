import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

const FADE_KEYFRAMES: Record<
  NonNullable<StaggeredAnimationProps["fadeDirection"]>,
  string
> = {
  up: "slide-up-fade-in",
  down: "slide-down-fade-in",
  left: "slide-left-fade-in",
  right: "slide-right-fade-in",
};

const FADE_ANIMATION_CLASS: Record<
  NonNullable<StaggeredAnimationProps["fadeDirection"]>,
  string
> = {
  up: "animate-slide-up-fade-in",
  down: "animate-slide-down-fade-in",
  left: "animate-slide-left-fade-in",
  right: "animate-slide-right-fade-in",
};

export interface StaggeredAnimationProps {
  children: React.ReactNode;
  index: number;
  baseDelay?: number;
  incrementDelay?: number;
  className?: string;
  fadeDirection?: "up" | "down" | "left" | "right";
  /** When true, skip motion (instant visible layout). */
  reducedMotion?: boolean;
  /**
   * When true, delay is `baseDelay + index * incrementDelay` so index `0` starts immediately.
   * Default keeps Bullyproof-style spacing: `baseDelay + (index + 1) * incrementDelay`.
   */
  chainFromZero?: boolean;
  /** Override default Tailwind animation duration (ms). */
  durationMs?: number;
  /** Override default easing, e.g. `cubic-bezier(0.16, 1, 0.3, 1)` for a fast-out settle. */
  easing?: string;
}

export function StaggeredAnimation({
  children,
  index,
  baseDelay = 0.2,
  incrementDelay = 0.15,
  className,
  fadeDirection = "down",
  reducedMotion = false,
  chainFromZero = false,
  durationMs,
  easing,
}: StaggeredAnimationProps) {
  const delay = chainFromZero
    ? baseDelay + index * incrementDelay
    : baseDelay + (index + 1) * incrementDelay;

  const direction = fadeDirection ?? "down";
  const usesCustomTiming = durationMs != null || easing != null;
  const animationClass = usesCustomTiming
    ? undefined
    : FADE_ANIMATION_CLASS[direction];

  if (reducedMotion) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <div
      className={cn("opacity-0", animationClass, className)}
      style={
        usesCustomTiming
          ? {
              animation: `${FADE_KEYFRAMES[direction]} ${(durationMs ?? 300) / 1000}s ${easing ?? "ease-out"} ${delay.toFixed(2)}s forwards`,
            }
          : {
              animationDelay: `${delay.toFixed(2)}s`,
              animationFillMode: "forwards",
            }
      }
    >
      {children}
    </div>
  );
}
