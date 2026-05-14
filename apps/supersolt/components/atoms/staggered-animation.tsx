import React from "react";
import { cn } from "@workspace/ui/lib/utils";

interface StaggeredAnimationProps {
  children: React.ReactNode;
  index: number;
  baseDelay?: number;
  incrementDelay?: number;
  /** When set, used as the CSS animation delay in seconds (overrides baseDelay / index math). */
  delaySeconds?: number;
  className?: string;
  fadeDirection?: "up" | "down" | "left" | "right" | "upFromBottom";
}

export function StaggeredAnimation({
  children,
  index,
  baseDelay = 0.2,
  incrementDelay = 0.15,
  delaySeconds,
  className,
  fadeDirection = "down",
}: StaggeredAnimationProps) {
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

  return (
    <div
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
