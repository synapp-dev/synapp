"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

export type AgentBotAvatarVideoProps = Omit<
  React.ComponentPropsWithoutRef<"video">,
  "children"
>;

/** The looping Supersolt bot. The webm has a transparent background, so a single
 *  video renders correctly on any surface — no light/dark variants needed. */
export function AgentBotAvatarVideo({
  className,
  ...videoProps
}: AgentBotAvatarVideoProps) {
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
      <source src="/images/supersolt-bot-dark.webm" type="video/webm" />
    </video>
  );
}
