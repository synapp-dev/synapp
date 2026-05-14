"use client";

import { AppHeader } from "@/components/organisms/app-header";
import { AppRightSidebar } from "@/components/organisms/app-right-sidebar";
import { AppSidebar } from "@/components/organisms/app-sidebar";
import { MeLoader } from "@/components/molecules/me-loader";
import { ScopedNavigationProvider } from "@/entities/access/scoped-navigation-context";
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
            "--right-sidebar-width-icon": "12rem",
          } as React.CSSProperties
        }
      >
        <ScopedNavigationProvider>
          <AgentChatProvider>
            <AgentRightSidebarAutoOpen />
            <MeLoader />
            <AppSidebar />
          <div className="mx-auto flex min-w-0 flex-1 max-w-7xl flex-col">
            <AppHeader />
            <SidebarInset className="flex min-w-0 flex-1 flex-col">
              <div className="min-w-0 px-6 py-3">{children}</div>
            </SidebarInset>
          </div>
            <AppRightSidebar />
          </AgentChatProvider>
        </ScopedNavigationProvider>
      </RightSidebarProvider>
    </SidebarProvider>
  );
}
