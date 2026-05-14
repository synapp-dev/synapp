"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { useAgentChat } from "@/entities/ai-agent-chat/components/agent-chat-provider";
import { isAgentOnlyRoute } from "@/entities/ai-agent-chat/lib/agent-right-shell-pathname";
import { useRightSidebar } from "@workspace/ui/components/right-sidebar-provider";

/**
 * When leaving `/agent` with an active thread, expand the right sidebar (desktop + mobile sheet).
 */
export function AgentRightSidebarAutoOpen() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);
  const { messages } = useAgentChat();
  const { setOpen, setOpenMobile } = useRightSidebar();

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;

    if (prev === null) return;

    const leftAgent =
      isAgentOnlyRoute(prev) && !isAgentOnlyRoute(pathname);
    if (leftAgent && messages.length > 0) {
      setOpen(true);
      setOpenMobile(true);
    }
  }, [pathname, messages.length, setOpen, setOpenMobile]);

  return null;
}
