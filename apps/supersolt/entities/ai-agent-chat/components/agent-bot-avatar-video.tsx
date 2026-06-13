"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import { cn } from "@workspace/ui/lib/utils";

export type AgentBotVideoAppearance = "match-app" | "inverted";

export type AgentBotAvatarVideoProps = Omit<
  React.ComponentPropsWithoutRef<"video">,
  "children"
> & {
  /** `inverted` uses the dark bot on a dark panel in light mode (and vice versa). */
  appearance?: AgentBotVideoAppearance;
};

export function AgentBotAvatarVideo({
  className,
  appearance = "match-app",
  ...videoProps
}: AgentBotAvatarVideoProps) {
  const { resolvedTheme } = useTheme();
  const appIsDark = resolvedTheme === "dark";
  const useDarkBot =
    appearance === "inverted" ? !appIsDark : appIsDark;
  const src = useDarkBot
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
