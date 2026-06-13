"use client";

import { AppHeader } from "@/components/organisms/app-header";
import { AppRightSidebar } from "@/components/organisms/app-right-sidebar";
import { AppSidebar } from "@/components/organisms/app-sidebar";
import { MeLoader } from "@/components/shell/me-loader";
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
        style={
          {
            "--right-sidebar-width": "21rem",
          } as React.CSSProperties
        }
      >
        <ScopedNavigationProvider>
          <InventorySetupImportProvider>
            <AgentChatProvider>
              <AgentRightSidebarAutoOpen />
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
