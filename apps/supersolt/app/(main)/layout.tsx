"use client";

import { AppHeader } from "@/components/organisms/app-header";
import { AppRightSidebar } from "@/components/organisms/app-right-sidebar";
import { AppSidebar } from "@/components/organisms/app-sidebar";
import { MeLoader } from "@/components/shell/me-loader";
import { SidebarAutoCollapse } from "@/components/shell/sidebar-auto-collapse";
import { AGENT_DOCK_BREAKPOINT } from "@/lib/responsive-breakpoints";
import { ScopedNavigationProvider } from "@/entities/access/scoped-navigation-context";
import { InventorySetupImportProvider } from "@/entities/inventory-setup/components/inventory-setup-import-provider";
import { AgentChatProvider } from "@/entities/ai-agent-chat/components/agent-chat-provider";
import { AgentRightSidebarAutoOpen } from "@/entities/ai-agent-chat/components/agent-right-sidebar-auto-open";

import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { RightSidebarProvider } from "@workspace/ui/components/right-sidebar-provider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider className="min-h-svh w-full">
      <RightSidebarProvider
        mobileBreakpoint={AGENT_DOCK_BREAKPOINT}
        style={
          {
            "--right-sidebar-width": "21rem",
            // Collapsed rail must be wide enough for the Superbot mascot so
            // layout reserves his lane and content never slides underneath him.
            "--right-sidebar-width-icon": "6.5rem",
          } as React.CSSProperties
        }
      >
        <ScopedNavigationProvider>
          <InventorySetupImportProvider>
            <AgentChatProvider>
              <AgentRightSidebarAutoOpen />
              <SidebarAutoCollapse />
              <MeLoader />
              <AppSidebar />
              <div className="mx-auto flex min-w-0 flex-1 max-w-7xl flex-col">
                <AppHeader />
                <SidebarInset className="flex min-w-0 flex-1 flex-col">
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col px-6 py-3">
                    {children}
                  </div>
                </SidebarInset>
              </div>
              <AppRightSidebar />
            </AgentChatProvider>
          </InventorySetupImportProvider>
        </ScopedNavigationProvider>
      </RightSidebarProvider>
    </SidebarProvider>
  );
}
