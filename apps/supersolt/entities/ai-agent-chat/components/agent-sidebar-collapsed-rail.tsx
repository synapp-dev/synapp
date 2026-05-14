"use client";

import { useTheme } from "next-themes";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { useRightSidebar } from "@workspace/ui/components/right-sidebar-provider";
import { cn } from "@workspace/ui/lib/utils";

export function AgentSidebarCollapsedRail({
  className,
}: {
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const { setOpen } = useRightSidebar();
  const assistantVideoTheme = resolvedTheme === "dark" ? "dark" : "light";
  const src =
    assistantVideoTheme === "dark"
      ? "/images/supersolt-bot-dark.webm"
      : "/images/supersolt-bot-light.webm";

  return (
    <button
      type="button"
      aria-label="Open Superbot sidebar"
      onClick={() => setOpen(true)}
      className={cn(
        "group flex w-full min-h-0 flex-1 flex-col items-center justify-center border-0 bg-transparent p-0 shadow-none outline-none",
        "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex max-w-full shrink-0">
            <video
              key={src}
              aria-hidden
              autoPlay
              loop
              muted
              playsInline
              className={cn(
                "pointer-events-none h-[8.4rem] w-auto max-w-[8.4rem] object-contain",
                "origin-center scale-100 transform-gpu transition-transform duration-300 ease-out will-change-transform",
                "group-hover:scale-[1.2]",
              )}
            >
              <source src={src} type="video/webm" />
            </video>
          </span>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={10}>
          get help from superbot!
        </TooltipContent>
      </Tooltip>
    </button>
  );
}
