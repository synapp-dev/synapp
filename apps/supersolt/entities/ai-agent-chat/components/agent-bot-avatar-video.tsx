"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import { cn } from "@workspace/ui/lib/utils";

export type AgentBotAvatarVideoProps = Omit<
  React.ComponentPropsWithoutRef<"video">,
  "children"
>;

export function AgentBotAvatarVideo({
  className,
  ...videoProps
}: AgentBotAvatarVideoProps) {
  const { resolvedTheme } = useTheme();
  const assistantVideoTheme = resolvedTheme === "dark" ? "dark" : "light";
  const src =
    assistantVideoTheme === "dark"
      ? "/images/supersolt-bot-dark.webm"
      : "/images/supersolt-bot-light.webm";

  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      {...videoProps}
      className={cn("select-none object-contain", className)}
    >
      <source src={src} type="video/webm" />
    </video>
  );
}
