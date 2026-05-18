"use client";

import { useTheme } from "next-themes";

import { useRightSidebar } from "@workspace/ui/components/right-sidebar-provider";
import { cn } from "@workspace/ui/lib/utils";

import { AgentBotAvatarVideo } from "@/entities/ai-agent-chat/components/agent-bot-avatar-video";

export function AgentSidebarCollapsedRail({
  className,
}: {
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const { setOpen } = useRightSidebar();
  const themeKey = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <div
      className={cn(
        "pointer-events-none relative h-full min-h-0 w-full flex-1 overflow-visible",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Talk to Superbot"
        onClick={() => setOpen(true)}
        className={cn(
          "group/bot pointer-events-auto fixed top-16 z-30 inline-flex flex-col items-center border-0 bg-transparent p-0 shadow-none outline-none",
          "right-[max(1.75rem,env(safe-area-inset-right,0px))] -translate-x-[35%]",
          "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        <AgentBotAvatarVideo
          key={themeKey}
          aria-hidden
          className={cn(
            "h-24 w-auto max-w-[min(6.5rem,24vw)] origin-center transform-gpu",
            "animate-slide-down-fade-in-slow transition-transform duration-300 ease-out will-change-transform",
            "group-hover/bot:scale-[1.12]",
          )}
        />
        <span
          className={cn(
            "text-foreground mt-1 max-w-[14rem] px-1 text-center text-base font-semibold leading-snug tracking-tight whitespace-nowrap",
            "translate-y-14 opacity-0 transition-[opacity,transform] duration-300 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100",
            "group-hover/bot:translate-y-0 group-hover/bot:opacity-100",
          )}
          aria-hidden
        >
          Talk to Superbot!
        </span>
      </button>
    </div>
  );
}
