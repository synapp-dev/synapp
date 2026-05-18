"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import { AgentBotAvatarVideo } from "@/entities/ai-agent-chat/components/agent-bot-avatar-video";
import { AgentChatPanel } from "@/entities/ai-agent-chat/components/agent-chat-panel";
import { AgentSidebarCollapsedRail } from "@/entities/ai-agent-chat/components/agent-sidebar-collapsed-rail";
import { shouldShowAgentRightShell } from "@/entities/ai-agent-chat/lib/agent-right-shell-pathname";
import { RightSidebar } from "@workspace/ui/components/right-sidebar";
import { SidebarContent } from "@workspace/ui/components/sidebar";
import { useRightSidebar } from "@workspace/ui/components/right-sidebar-provider";
import { cn } from "@workspace/ui/lib/utils";

export function AppRightSidebar() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const { open, isMobile } = useRightSidebar();
  const expandedThemeKey = resolvedTheme === "dark" ? "dark" : "light";

  if (!shouldShowAgentRightShell(pathname)) {
    return null;
  }

  const showCollapsedRail = !open && !isMobile;

  return (
    <RightSidebar
      collapsible="icon"
      variant="floating"
      className={cn(
        "z-20 pb-2 pl-2 pr-4 pt-11 md:pb-8 md:pr-5 md:pt-19",
        "[&_[data-slot=right-sidebar-inner]]:shadow-md",
        "group-data-[state=collapsed]:p-1",
        "group-data-[state=collapsed]:[&_[data-slot=right-sidebar-inner]]:border-0",
        "group-data-[state=collapsed]:[&_[data-slot=right-sidebar-inner]]:bg-transparent",
        "group-data-[state=collapsed]:[&_[data-slot=right-sidebar-inner]]:shadow-none",
        "group-data-[state=collapsed]:[&_[data-slot=right-sidebar-inner]]:rounded-none",
        "group-data-[state=collapsed]:[&_[data-slot=right-sidebar-inner]]:overflow-visible",
      )}
    >
      <SidebarContent
        className={cn(
          "min-h-0 gap-0 p-0",
          showCollapsedRail && "!overflow-visible bg-transparent",
          open && !isMobile && "relative overflow-visible",
          !showCollapsedRail && (!open || isMobile) && "overflow-hidden",
        )}
      >
        {open && !isMobile ? (
          <div
            className="pointer-events-none absolute left-1/2 top-0 -z-10 flex -translate-x-1/2 -translate-y-[75%] translate-x-[175%] justify-center"
            aria-hidden
          >
            <AgentBotAvatarVideo
              key={expandedThemeKey}
              className="h-14 w-auto max-w-[min(5.75rem,42vw)] animate-slide-up-fade-in-slowest animation-delay-1000"
            />
          </div>
        ) : null}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              showCollapsedRail &&
                "pointer-events-none absolute inset-0 overflow-hidden opacity-0",
            )}
            aria-hidden={showCollapsedRail || undefined}
          >
            <AgentChatPanel variant="sidebar" />
          </div>
          {showCollapsedRail ? (
            <div className="flex min-h-0 flex-1 flex-col items-stretch">
              <AgentSidebarCollapsedRail />
            </div>
          ) : null}
        </div>
      </SidebarContent>
    </RightSidebar>
  );
}
