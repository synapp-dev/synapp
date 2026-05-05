"use client";

import * as React from "react";

import { RightSidebar } from "@workspace/ui/components/right-sidebar";
import { SidebarContent } from "@workspace/ui/components/sidebar";

import { useSandboxRightSidebar } from "@/components/organisms/sandbox-right-sidebar-provider";

export function AppRightSidebar() {
  const { setSidebarMountElement, sidebarOccupied } = useSandboxRightSidebar();

  const mountRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      setSidebarMountElement(el);
    },
    [setSidebarMountElement],
  );

  return (
    <RightSidebar collapsible="icon">
      <SidebarContent className="gap-0">
        <div ref={mountRef} className="flex min-h-0 flex-1 flex-col">
          {!sidebarOccupied ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              Future secondary panel content
            </p>
          ) : null}
        </div>
      </SidebarContent>
    </RightSidebar>
  );
}
