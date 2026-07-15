import React from "react";
import { cn } from "@workspace/ui/lib/utils";

interface StaggeredAnimationProps {
  children: React.ReactNode;
  index: number;
  baseDelay?: number;
  incrementDelay?: number;
  className?: string;
  fadeDirection?: "up" | "down" | "left" | "right";
}

export function StaggeredAnimation({
  children,
  index,
  baseDelay = 0.2,
  incrementDelay = 0.15,
  className,
  fadeDirection = "down",
}: StaggeredAnimationProps) {
  const delay = baseDelay + (index + 1) * incrementDelay;

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
      default:
        return "animate-slide-down-fade-in";
    }
  };

  return (
    <div
      className={cn("opacity-0", getFadeAnimation(), className)}
      style={{
        animationDelay: `${delay.toFixed(2)}s`,
        animationFillMode: "forwards",
      }}
    >
      {children}
    </div>
  );
}
