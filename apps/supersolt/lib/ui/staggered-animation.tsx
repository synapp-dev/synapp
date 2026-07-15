"use client";

import React from "react";
import { cn } from "@workspace/ui/lib/utils";
import { useSplashPageIntroHold } from "@/lib/ui/use-splash-page-intro-hold";

interface StaggeredAnimationProps {
  children: React.ReactNode;
  index: number;
  baseDelay?: number;
  incrementDelay?: number;
  /** When set, used as the CSS animation delay in seconds (overrides baseDelay / index math). */
  delaySeconds?: number;
  className?: string;
  fadeDirection?: "up" | "down" | "left" | "right" | "upFromBottom";
  /**
   * On a first-load splash, wait for the splash's page-intro moment before
   * playing — and before mounting children, so their own entrance effects
   * (chart draws, count-ups) restart in view once the page appears. Default
   * true; pass false for elements with their own splash choreography (e.g.
   * the sidebar nav).
   */
  holdForSplash?: boolean;
}

export function StaggeredAnimation({
  children,
  index,
  baseDelay = 0.2,
  incrementDelay = 0.15,
  delaySeconds,
  className,
  fadeDirection = "down",
  holdForSplash = true,
}: StaggeredAnimationProps) {
  const held = useSplashPageIntroHold() && holdForSplash;

  const delay =
    delaySeconds !== undefined
      ? delaySeconds
      : baseDelay + (index + 1) * incrementDelay;

  const getFadeAnimation = () => {
    switch (fadeDirection) {
      case "up":
        return "animate-slide-up-fade-in";
      case "down":
        return "animate-slide-down-fade-in";
      case "left":
        return "animate-slide-left-fade-in";
      case "right":
        return "animate-slide-right-fade-in";
      case "upFromBottom":
        return "animate-slide-up-from-bottom";
    }
  };

  // While the splash holds the page, keep the slot in layout but hidden and
  // WITHOUT children — the key swap on release remounts them, restarting
  // their own mount animations so everything plays once the page is visible.
  if (held) {
    return <div key="held" className={cn("opacity-0", className)} />;
  }

  return (
    <div
      key="play"
      className={cn("opacity-0", getFadeAnimation(), className)}
      style={{
        animationDelay: `${delay.toFixed(3)}s`,
        animationFillMode: "forwards",
      }}
    >
      {children}
    </div>
  );
}
